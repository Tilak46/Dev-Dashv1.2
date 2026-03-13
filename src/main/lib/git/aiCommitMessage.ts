import { spawn } from "node:child_process";
import path from "node:path";

import { openRouterChat } from "../ai/openrouter";

type GitExecResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type CommitMessageMode = "staged" | "all";

type AiCommitJson = {
  type?: string;
  scope?: string;
  subject?: string;
  bullets?: string[];
};

function runGit(
  cwd: string,
  args: string[],
  opts?: { timeoutMs?: number },
): Promise<GitExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeoutMs = opts?.timeoutMs ?? 30_000;
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`git ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function getRepoRoot(projectPath: string): Promise<string | null> {
  const res = await runGit(projectPath, ["rev-parse", "--show-toplevel"], {
    timeoutMs: 10_000,
  }).catch(() => null);
  if (!res || res.code !== 0) return null;
  const root = res.stdout.trim();
  return root ? root : null;
}

function redactSecrets(text: string): string {
  let out = String(text ?? "");

  // Common env lines
  out = out.replace(/^(\s*GEMINI_API_KEY\s*=\s*).+$/gim, "$1<redacted>");
  out = out.replace(/^(\s*GOOGLE_API_KEY\s*=\s*).+$/gim, "$1<redacted>");
  out = out.replace(
    /^(\s*OPENROUTER_API_KEY\s*=\s*).+$/gim,
    "$1<redacted>",
  );

  // Google API key pattern (rough)
  out = out.replace(/AIzaSy[0-9A-Za-z_-]{20,}/g, "<redacted>");

  // OpenAI-ish keys
  out = out.replace(/\bsk-[0-9A-Za-z]{20,}\b/g, "<redacted>");

  // Private keys
  out = out.replace(
    /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
    "<redacted-private-key>",
  );

  return out;
}

function truncate(text: string, maxChars: number): string {
  const t = String(text ?? "");
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}\n\n<TRUNCATED ${t.length - maxChars} chars>`;
}

function firstLine(s: string): string {
  const line = String(s ?? "").split(/\r?\n/).find((l) => l.trim()) ?? "";
  return line.trim();
}

function cleanCommitLine(s: string): string {
  let out = firstLine(s);
  out = out.replace(/^```+/, "").replace(/```+$/, "");
  out = out.replace(/^['"`]+|['"`]+$/g, "");
  out = out.replace(/\s+/g, " ").trim();
  if (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

function cleanBullet(s: string): string {
  let out = String(s ?? "").trim();
  out = out.replace(/^[-*\u2022]+\s*/, "");
  out = out.replace(/\s+/g, " ").trim();
  if (out.endsWith(".")) out = out.slice(0, -1);
  return out;
}

function isGenericSubject(subject: string): boolean {
  const s = String(subject ?? "")
    .trim()
    .toLowerCase();
  if (!s) return true;
  const bad = [
    "update project files",
    "update files",
    "update code",
    "update",
    "changes",
    "minor fixes",
    "fixes",
    "wip",
  ];
  if (bad.includes(s)) return true;
  if (s.startsWith("update ") && s.length <= 18) return true;
  if (s.startsWith("fix ") && s.length <= 10) return true;
  return false;
}

function extractJsonObject(text: string): string {
  const t = String(text ?? "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return t.trim();
  return t.slice(start, end + 1).trim();
}

function normalizeType(t: string): string {
  const s = String(t ?? "").trim().toLowerCase();
  const allowed = new Set([
    "feat",
    "fix",
    "refactor",
    "docs",
    "test",
    "chore",
    "style",
    "build",
    "ci",
    "perf",
    "revert",
  ]);
  if (allowed.has(s)) return s;
  return "chore";
}

function normalizeScope(s: string): string {
  const out = String(s ?? "").trim();
  if (!out) return "";
  // Keep scope short and safe for conventional commits.
  return out
    .replace(/[^a-zA-Z0-9\-_/]/g, "")
    .replace(/\//g, "-")
    .slice(0, 32);
}

function normalizeSubject(s: string): string {
  let out = String(s ?? "").trim();
  out = out.replace(/^['"`]+|['"`]+$/g, "");
  out = out.replace(/\s+/g, " ").trim();
  if (out.endsWith(".")) out = out.slice(0, -1);
  // Capitalization: conventional commits usually use lowercase imperative.
  out = out.charAt(0).toLowerCase() + out.slice(1);
  return out;
}

function formatCommitMessage(json: {
  type: string;
  scope: string;
  subject: string;
  bullets: string[];
}): string {
  const title = json.scope
    ? `${json.type}(${json.scope}): ${json.subject}`
    : `${json.type}: ${json.subject}`;

  const uniqueBullets = Array.from(
    new Set(json.bullets.map(cleanBullet).filter(Boolean)),
  ).slice(0, 5);

  if (uniqueBullets.length === 0) return title;

  const body = uniqueBullets.map((b) => `- ${b}`).join("\n");
  return `${title}\n\n${body}`;
}

function isConventionalCommit(line: string): boolean {
  return /^(feat|fix|chore|refactor|docs|test|style|build|ci|perf|revert)(\([^\)\r\n]+\))?: .+/.test(
    line,
  );
}

function parseNameStatus(text: string): Array<{ status: string; path: string }> {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: Array<{ status: string; path: string }> = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const status = parts[0] ?? "";
    if (!status) continue;

    // Handle rename lines: R100 old new
    if (status.startsWith("R") && parts.length >= 3) {
      out.push({ status: "R", path: parts[parts.length - 1] });
      continue;
    }

    const p = parts.slice(1).join(" ").trim();
    if (!p) continue;
    out.push({ status, path: p });
  }

  return out;
}

function fallbackCommitMessage(changedPaths: string[]): string {
  const paths = changedPaths.map((p) => p.replace(/\\/g, "/"));
  const has = (re: RegExp) => paths.some((p) => re.test(p));
  const all = (re: RegExp) => paths.length > 0 && paths.every((p) => re.test(p));

  const onlyDocs = all(/\.(md|mdx|txt)$/i);
  if (onlyDocs) return "docs: update documentation";

  const onlyTests = all(/(^|\/)test(\/|$)|\.(spec|test)\./i);
  if (onlyTests) return "test: update tests";

  if (has(/src\/main\/lib\/ai\//i) || has(/gemini\.ts$/i)) {
    return "feat(ai): add Gemini provider support";
  }

  if (has(/src\/main\/ipcHandlers\/aiHandlers\.ts$/i)) {
    return "feat(ai): improve commit message generation";
  }

  if (has(/src\/renderer\/components\/GitActionSheet\.tsx$/i)) {
    return "feat(git): generate commit messages from staged diff";
  }

  if (has(/src\/app\//i) && has(/\/create-package\//i)) {
    return "feat(create-package): extend create package flow";
  }

  if (has(/package\.json$/i) || has(/package-lock\.json$/i)) {
    return "chore: update dependencies";
  }

  return "chore: update project files";
}

function fallbackBulletsFromChanged(
  changes: Array<{ status: string; path: string }>,
): string[] {
  const paths = changes.map((c) => c.path.replace(/\\/g, "/"));
  const has = (re: RegExp) => paths.some((p) => re.test(p));

  if (has(/src\/app\//i) && has(/\/create-package\//i)) {
    return [
      "Add new create package route and components",
      "Wire up repricing, day, and summary sections",
    ];
  }

  if (has(/src\/main\/lib\/ai\//i)) {
    return [
      "Add Gemini client with model auto-selection",
      "Route AI features through Gemini when configured",
    ];
  }

  if (has(/src\/main\/lib\/git\/aiCommitMessage\.ts$/i)) {
    return [
      "Generate commit messages from staged diff",
      "Add validation and fallback formatting",
    ];
  }

  // Generic-but-useful: group by top folder and action.
  const topFolder = (p: string) => {
    const segs = p.split("/").filter(Boolean);
    return segs[0] || "files";
  };

  const counts = new Map<string, number>();
  for (const p of paths) counts.set(topFolder(p), (counts.get(topFolder(p)) || 0) + 1);
  const common = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  const added = changes.filter((c) => c.status === "A").length;
  const modified = changes.filter((c) => c.status === "M").length;
  const renamed = changes.filter((c) => c.status === "R").length;

  const bullet1 = common
    ? `Update ${common} files (${paths.length} changed)`
    : `Update files (${paths.length} changed)`;
  const bullet2Parts: string[] = [];
  if (added) bullet2Parts.push(`${added} added`);
  if (modified) bullet2Parts.push(`${modified} modified`);
  if (renamed) bullet2Parts.push(`${renamed} renamed`);
  const bullet2 = bullet2Parts.length
    ? `Change breakdown: ${bullet2Parts.join(", ")}`
    : "Change breakdown: multiple updates";

  return [bullet1, bullet2];
}

function ensureBullets(message: string, bullets: string[]): string {
  const clean = bullets.map(cleanBullet).filter(Boolean);
  if (clean.length === 0) return message;
  if (message.includes("\n\n- ")) return message;
  return `${message}\n\n${clean.map((b) => `- ${b}`).join("\n")}`;
}

function subjectTooLong(line: string): boolean {
  const idx = line.indexOf(": ");
  if (idx === -1) return false;
  const subject = line.slice(idx + 2);
  return subject.length > 72;
}

async function gitOrEmpty(repoRoot: string, args: string[]): Promise<string> {
  const res = await runGit(repoRoot, ["-C", repoRoot, ...args], {
    timeoutMs: 30_000,
  }).catch(() => null);
  if (!res || res.code !== 0) return "";
  return res.stdout;
}

async function buildGitContext(repoRoot: string, mode: CommitMessageMode) {
  const stagedNameStatus = await gitOrEmpty(repoRoot, [
    "diff",
    "--staged",
    "--name-status",
  ]);
  const stagedStat = await gitOrEmpty(repoRoot, ["diff", "--staged", "--stat"]);
  const stagedPatch = await gitOrEmpty(repoRoot, [
    "diff",
    "--staged",
    "--no-color",
    "--no-ext-diff",
    "-U2",
  ]);

  const unstagedNameStatus =
    mode === "all"
      ? await gitOrEmpty(repoRoot, ["diff", "--name-status"])
      : "";
  const unstagedStat =
    mode === "all" ? await gitOrEmpty(repoRoot, ["diff", "--stat"]) : "";
  const unstagedPatch =
    mode === "all"
      ? await gitOrEmpty(repoRoot, ["diff", "--no-color", "--no-ext-diff", "-U2"])
      : "";

  const status = await gitOrEmpty(repoRoot, ["status", "--porcelain=v1", "-b"]);

  return {
    status,
    stagedNameStatus,
    stagedStat,
    stagedPatch,
    unstagedNameStatus,
    unstagedStat,
    unstagedPatch,
  };
}

export async function generateAiCommitMessage(args: {
  projectPath: string;
  mode?: CommitMessageMode;
}): Promise<string> {
  const projectPath = String(args.projectPath ?? "").trim();
  if (!projectPath) throw new Error("projectPath is required");

  const repoRoot = await getRepoRoot(projectPath);
  if (!repoRoot) throw new Error("Not a git repository");

  const mode: CommitMessageMode = args.mode ?? "staged";
  const ctx = await buildGitContext(repoRoot, mode);

  if (mode === "staged") {
    const hasStaged = Boolean(String(ctx.stagedNameStatus).trim());
    if (!hasStaged) throw new Error("No staged changes to generate a message.");
  } else {
    const hasAny =
      Boolean(String(ctx.stagedNameStatus).trim()) ||
      Boolean(String(ctx.unstagedNameStatus).trim());
    if (!hasAny) throw new Error("No changes found to generate a message.");
  }

  const repoName = path.basename(repoRoot);

  const payload = redactSecrets(
    [
      `repo=${repoName}`,
      `mode=${mode}`,
      "",
      "# git status",
      truncate(ctx.status, 1200),
      "",
      "# staged name-status",
      truncate(ctx.stagedNameStatus, 2000),
      "",
      "# staged diffstat",
      truncate(ctx.stagedStat, 2000),
      "",
      "# staged patch (excerpt)",
      truncate(ctx.stagedPatch, 12_000),
      ...(mode === "all"
        ? [
            "",
            "# unstaged name-status",
            truncate(ctx.unstagedNameStatus, 2000),
            "",
            "# unstaged diffstat",
            truncate(ctx.unstagedStat, 2000),
            "",
            "# unstaged patch (excerpt)",
            truncate(ctx.unstagedPatch, 6000),
          ]
        : []),
    ].join("\n"),
  );

  const changedPaths = [
    ...parseNameStatus(ctx.stagedNameStatus),
    ...parseNameStatus(ctx.unstagedNameStatus),
  ].map((x) => x.path);

  const suggestedScope = (() => {
    const paths = changedPaths.map((p) => p.replace(/\\/g, "/"));
    // Try to find a meaningful scope from common directory patterns.
    const hit = (re: RegExp, scope: string) => (paths.some((p) => re.test(p)) ? scope : "");
    return (
      hit(/src\/main\/lib\/ai\//i, "ai") ||
      hit(/src\/main\/ipcHandlers\//i, "main") ||
      hit(/src\/renderer\//i, "renderer") ||
      hit(/src\/app\/\(protected\)\/create-package\//i, "create-package") ||
      hit(/\/create-package\//i, "create-package") ||
      ""
    );
  })();

  const system = `You generate excellent git commit messages.

Return ONLY valid JSON (no markdown, no code fences) in this shape:
{
  "type": "feat|fix|refactor|docs|test|chore|style|build|ci|perf",
  "scope": "optional-short-scope",
  "subject": "imperative, <=72 chars, no trailing period",
  "bullets": ["2-4 concise summary bullets"]
}

Rules:
- Base everything ONLY on the provided git context.
- Be specific and accurate; do NOT write generic subjects like "update project files".
- Subject must be concrete and to-the-point.
- Bullets must describe what changed (not intentions), 4-10 words each.
- Bullets are REQUIRED (2 to 4 bullets).
- Bullets must describe what changed (not intentions), 4-12 words each.
- If scope is unclear, use empty string.
${suggestedScope ? `- Suggested scope: ${suggestedScope}` : ""}`;

  const user = `Git context (may be truncated):\n\n${payload}`;

  const attempt = async (maxTokens: number, context: string) => {
    const raw = await openRouterChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: context },
      ],
      temperature: 0,
      maxTokens,
    });

    const jsonText = extractJsonObject(raw);
    const parsed = JSON.parse(jsonText) as AiCommitJson;

    const type = normalizeType(String(parsed?.type ?? ""));
    const scope = normalizeScope(String(parsed?.scope ?? suggestedScope ?? ""));
    const subject = normalizeSubject(String(parsed?.subject ?? ""));
    const bullets = Array.isArray(parsed?.bullets)
      ? parsed.bullets.map(String)
      : [];

    const cleanedBullets = bullets.map(cleanBullet).filter(Boolean).slice(0, 5);

    if (cleanedBullets.length < 2) {
      throw new Error("AI returned too few bullets");
    }

    if (!subject || subjectTooLong(`${type}: ${subject}`) || isGenericSubject(subject)) {
      throw new Error("AI returned an invalid/generic subject");
    }

    return formatCommitMessage({
      type,
      scope,
      subject,
      bullets: cleanedBullets,
    });
  };

  // Try full context first.
  try {
    return await attempt(420, user);
  } catch {
    // Retry with a smaller, higher-signal context (files + diffstat only).
    const smaller = redactSecrets(
      [
        `repo=${repoName}`,
        `mode=${mode}`,
        "",
        "# staged name-status",
        truncate(ctx.stagedNameStatus, 4000),
        "",
        "# staged diffstat",
        truncate(ctx.stagedStat, 4000),
        ...(mode === "all"
          ? [
              "",
              "# unstaged name-status",
              truncate(ctx.unstagedNameStatus, 4000),
              "",
              "# unstaged diffstat",
              truncate(ctx.unstagedStat, 4000),
            ]
          : []),
      ].join("\n"),
    );

    try {
      return await attempt(420, `Git context:\n\n${smaller}`);
    } catch {
      const fallbackTitle = fallbackCommitMessage(changedPaths);
      const fallbackBullets = fallbackBulletsFromChanged(
        [...parseNameStatus(ctx.stagedNameStatus), ...parseNameStatus(ctx.unstagedNameStatus)],
      );
      return ensureBullets(fallbackTitle, fallbackBullets);
    }
  }
}
