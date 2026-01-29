type GeminiApiVersion = "v1" | "v1beta";
type GeminiResolved = { apiVersion: GeminiApiVersion; modelName: string };

class GeminiQuotaError extends Error {
  public retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let geminiApiKey = "";
let resolvedModel: GeminiResolved | null = null;

export const initGemini = (apiKey: string) => {
  geminiApiKey = (apiKey ?? "").trim();
  resolvedModel = null;
};

function assertInit() {
  if (!geminiApiKey) {
    throw new Error("Gemini AI not initialized. Please set API Key.");
  }
}

const API_BASE = "https://generativelanguage.googleapis.com";

function apiUrl(apiVersion: GeminiApiVersion, path: string) {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE}/${apiVersion}/${trimmed}`;
}

async function listModels(apiVersion: GeminiApiVersion) {
  const url = apiUrl(apiVersion, "models");
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-goog-api-key": geminiApiKey,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ListModels failed (${apiVersion}): ${res.status} ${text}`);
  }
  return (await res.json()) as {
    models?: Array<{
      name: string;
      supportedGenerationMethods?: string[];
    }>;
  };
}

function extractTextFromResponse(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((p: any) => p?.text)
        .filter(Boolean)
        .join("\n")
    : "";
  return (text || "").trim();
}

async function generateText(
  apiVersion: GeminiApiVersion,
  modelName: string,
  prompt: string,
) {
  const fullModelName = modelName.startsWith("models/")
    ? modelName
    : `models/${modelName}`;

  const url = apiUrl(apiVersion, `${fullModelName}:generateContent`);
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 256,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const text = await res.text().catch(() => "");
    let retryAfterSeconds: number | undefined;
    try {
      const json = JSON.parse(text);
      const retryDelay = json?.error?.details?.find((d: any) =>
        d?.["@type"]?.includes("RetryInfo"),
      )?.retryDelay;
      if (typeof retryDelay === "string" && retryDelay.endsWith("s")) {
        retryAfterSeconds = Number(retryDelay.slice(0, -1));
      }
    } catch {
      // ignore parse errors
    }

    throw new GeminiQuotaError(
      "Gemini quota exceeded/disabled for this API key (your limits show as 0). Add billing/enable quota in Google AI Studio, or disable AI features.",
      retryAfterSeconds,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Gemini generateContent failed (${apiVersion}/${modelName}): ${res.status} ${text}`,
    );
    (err as any).status = res.status;
    throw err;
  }

  const json = await res.json();
  const out = extractTextFromResponse(json);
  if (!out) {
    throw new Error(
      `Gemini returned empty response (${apiVersion}/${modelName}).`,
    );
  }
  return out;
}

async function resolveWorkingModel(): Promise<GeminiResolved> {
  if (resolvedModel) return resolvedModel;

  const preferredModels = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
  ];

  const versions: GeminiApiVersion[] = ["v1", "v1beta"];
  const probePrompt = "Reply with the single word: OK";

  // 1) Fast probe with common model IDs across both API versions.
  for (const apiVersion of versions) {
    for (const modelName of preferredModels) {
      try {
        console.log(`Trying Gemini Model: ${modelName} (${apiVersion})`);
        await generateText(apiVersion, modelName, probePrompt);
        resolvedModel = { apiVersion, modelName };
        return resolvedModel;
      } catch (e: any) {
        if (e instanceof GeminiQuotaError) throw e;
        const message = String(e?.message ?? e);
        console.warn(`Model ${modelName} failed (${apiVersion}):`, message);
      }
    }
  }

  // 2) ListModels fallback: pick a model that supports generateContent.
  for (const apiVersion of versions) {
    try {
      const data = await listModels(apiVersion);
      const models = (data.models ?? []).filter((m) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent"),
      );

      const ranked = models.sort((a, b) => {
        const aName = a.name || "";
        const bName = b.name || "";
        const score = (name: string) =>
          preferredModels.findIndex((p) => name.includes(p)) === -1
            ? 999
            : preferredModels.findIndex((p) => name.includes(p));
        return score(aName) - score(bName);
      });

      const pick = ranked[0]?.name;
      if (pick) {
        const modelName = pick.replace(/^models\//, "");
        console.log(
          `Using Gemini Model from ListModels: ${modelName} (${apiVersion})`,
        );
        await generateText(apiVersion, modelName, probePrompt);
        resolvedModel = { apiVersion, modelName };
        return resolvedModel;
      }
    } catch (e: any) {
      if (e instanceof GeminiQuotaError) throw e;
      console.warn(
        `ListModels failed (${apiVersion}):`,
        String(e?.message ?? e),
      );
    }
  }

  throw new Error(
    "All Gemini models failed. Check API key, enable Generative Language API, and ensure your key has access to generateContent.",
  );
}

export const generateCommitMessage = async (diff: string): Promise<string> => {
  assertInit();

  const prompt = `You are an expert developer. Generate ONE concise conventional git commit message for the following diff.
Format: <type>(<scope>): <subject>
Rules:
- subject is <= 72 chars
- prefer type: feat|fix|chore|refactor|docs|test

Diff:
${diff.slice(0, 5000)}`;

  const { apiVersion, modelName } = await resolveWorkingModel();
  return await generateText(apiVersion, modelName, prompt);
};

export const explainLog = async (log: string): Promise<string> => {
  assertInit();
  const prompt = `You are an expert developer. Explain this error log in plain English, then give 3 concrete fixes.

Log:
${log.slice(0, 5000)}`;
  const { apiVersion, modelName } = await resolveWorkingModel();
  return await generateText(apiVersion, modelName, prompt);
};
