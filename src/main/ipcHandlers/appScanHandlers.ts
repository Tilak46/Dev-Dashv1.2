import { app, ipcMain, nativeImage, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { DetectedApp } from "../../types";

const MAX_RESULTS = 250;
const MAX_DEPTH = 10;

function toId(p: string) {
  return `app_${Buffer.from(p).toString("base64url")}`;
}

function prettyName(filePath: string) {
  const base = path.basename(filePath);
  return base.replace(/\.(lnk|exe)$/i, "");
}

async function walk(dir: string, depth: number, out: string[]) {
  if (out.length >= MAX_RESULTS) return;
  if (depth > MAX_DEPTH) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    if (out.length >= MAX_RESULTS) return;

    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip very noisy/system folders.
      const lower = ent.name.toLowerCase();
      if (
        lower === "node_modules" ||
        lower === "$recycle.bin" ||
        lower === "system volume information"
      ) {
        continue;
      }
      await walk(full, depth + 1, out);
      continue;
    }

    if (!ent.isFile()) continue;
    if (!/\.(lnk|exe)$/i.test(ent.name)) continue;

    out.push(full);
  }
}

function iconDataUrlFromPath(filePath: string): string | undefined {
  try {
    const img = nativeImage.createFromPath(filePath);
    if (!img || img.isEmpty()) return undefined;
    // Normalize size so the renderer list isn't huge.
    const resized = img.resize({ width: 32, height: 32 });
    const dataUrl = resized.toDataURL();
    return dataUrl || undefined;
  } catch {
    return undefined;
  }
}

function stripIconIndex(p: string): string {
  // DefaultIcon values can look like: "C:\\Path\\App.exe,0"
  return p.split(",")[0].trim();
}

function iconDataUrlForShortcut(linkPath: string): string | undefined {
  try {
    const info = shell.readShortcutLink(linkPath);
    const icon = info.icon ? stripIconIndex(info.icon) : "";
    const target = info.target || "";
    return (
      (icon ? iconDataUrlFromPath(icon) : undefined) ||
      (target ? iconDataUrlFromPath(target) : undefined)
    );
  } catch {
    // Fallback: some systems may still resolve icon directly from the .lnk
    return iconDataUrlFromPath(linkPath);
  }
}

export function registerAppScanHandlers() {
  ipcMain.handle("apps:scan", async (): Promise<DetectedApp[]> => {
    const candidates: string[] = [];

    const roots: string[] = [];
    try {
      roots.push(app.getPath("desktop"));
    } catch {
      // ignore
    }

    // Public desktop (common place for shortcuts)
    try {
      const publicDir = process.env["PUBLIC"];
      if (publicDir) roots.push(path.join(publicDir, "Desktop"));
    } catch {
      // ignore
    }

    // UserProfile desktop (in case OneDrive/Desktop mapping differs)
    try {
      const userProfile = process.env["USERPROFILE"];
      if (userProfile) roots.push(path.join(userProfile, "Desktop"));
    } catch {
      // ignore
    }

    // Start Menu locations (user + common)
    try {
      const startMenu = path.join(
        app.getPath("appData"),
        "Microsoft",
        "Windows",
        "Start Menu",
      );
      roots.push(startMenu);
      roots.push(path.join(startMenu, "Programs"));
    } catch {
      // ignore
    }

    try {
      const programData = process.env["ProgramData"];
      if (programData) {
        roots.push(
          path.join(programData, "Microsoft", "Windows", "Start Menu"),
        );
        roots.push(
          path.join(
            programData,
            "Microsoft",
            "Windows",
            "Start Menu",
            "Programs",
          ),
        );
      }
    } catch {
      // ignore
    }

    for (const r of roots) {
      await walk(r, 0, candidates);
      if (candidates.length >= MAX_RESULTS) break;
    }

    // Dedupe + filter out obvious junk
    const unique = Array.from(new Set(candidates)).filter((p) => {
      const n = path.basename(p).toLowerCase();
      return !n.includes("uninstall") && !n.includes("readme");
    });

    const results: DetectedApp[] = unique.slice(0, MAX_RESULTS).map((p) => {
      const ext = path.extname(p).toLowerCase();
      return {
        id: toId(p),
        name: prettyName(p),
        path: p,
        kind: ext === ".lnk" ? "shortcut" : "exe",
        iconDataUrl:
          ext === ".lnk" ? iconDataUrlForShortcut(p) : iconDataUrlFromPath(p),
      };
    });

    // Sort: has icon first, then name
    results.sort((a, b) => {
      const ai = a.iconDataUrl ? 0 : 1;
      const bi = b.iconDataUrl ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });

    return results;
  });
}
