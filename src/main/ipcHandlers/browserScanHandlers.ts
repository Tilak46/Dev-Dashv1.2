import { ipcMain } from "electron";
import type { DetectedBrowser } from "../../types";
import { scanInstalledBrowsersWindows } from "../lib/windowsBrowserScan";

export function registerBrowserScanHandlers() {
  ipcMain.handle("browsers:scan", async (): Promise<DetectedBrowser[]> => {
    if (process.platform !== "win32") return [];
    try {
      return await scanInstalledBrowsersWindows();
    } catch {
      return [];
    }
  });
}
