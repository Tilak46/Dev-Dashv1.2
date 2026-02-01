import { ipcMain } from "electron";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterKey(): string {
  return String(process.env["OPENROUTER_API_KEY"] ?? "").trim();
}

function getOpenRouterModel(): string {
  // Best free default for coding + errors
  return String(
    process.env["OPENROUTER_MODEL"] ?? "mistralai/devstral-2512:free",
  ).trim();
}

async function openRouterChat(args: {
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error(
      "AI not configured. Put OPENROUTER_API_KEY in devdash/.env (next to package.json) and restart DevDash.",
    );
  }

  const model = getOpenRouterModel();

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Optional but recommended by OpenRouter
      "HTTP-Referer": "https://devdash.local",
      "X-Title": "DevDash",
    },
    body: JSON.stringify({
      model,
      messages: args.messages,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 256,
    }),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "OpenRouter auth failed (401/403). Check OPENROUTER_API_KEY.",
      );
    }
    if (res.status === 429) {
      throw new Error(
        "OpenRouter rate-limited (429). Try again later or switch OPENROUTER_MODEL.",
      );
    }

    const detail = text ? ` ${text.slice(0, 500)}` : "";
    throw new Error(`OpenRouter request failed: ${res.status}.${detail}`);
  }

  let json: OpenRouterChatResponse;
  try {
    json = JSON.parse(text) as OpenRouterChatResponse;
  } catch {
    throw new Error(
      `OpenRouter returned invalid JSON. Response: ${text.slice(0, 500)}`,
    );
  }

  const out = String(json?.choices?.[0]?.message?.content ?? "").trim();
  if (!out) {
    const errMsg = String(json?.error?.message ?? "").trim();
    if (errMsg)
      throw new Error(`OpenRouter returned empty response: ${errMsg}`);
    throw new Error("OpenRouter returned empty response.");
  }

  return out;
}

export function registerAIHandlers() {
  ipcMain.handle(
    "ai:generate-commit-message",
    async (_event, diff: string): Promise<string> => {
      const safeDiff = String(diff ?? "").slice(0, 5000);
      const prompt = `You are an expert developer. Generate ONE concise conventional git commit message for the following diff.
Format: <type>(<scope>): <subject>
Rules:
- subject is <= 72 chars
- prefer type: feat|fix|chore|refactor|docs|test

Diff:
${safeDiff}`;

      return await openRouterChat({
        messages: [
          {
            role: "system",
            content:
              "You write excellent conventional commits. Output only the commit line.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 64,
      });
    },
  );

  ipcMain.handle(
    "ai:explain-log",
    async (_event, log: string): Promise<string> => {
      const safeLog = String(log ?? "").slice(0, 5000);
      const prompt = `You are an expert developer. Explain this error log in plain English, then give 3 concrete fixes.

Log:
${safeLog}`;

      return await openRouterChat({
        messages: [
          {
            role: "system",
            content:
              "You are a senior engineer. Be specific and actionable. No fluff.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 350,
      });
    },
  );
}
