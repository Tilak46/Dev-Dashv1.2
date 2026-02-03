import { ipcMain } from "electron";
import { scanProjectForRoutes } from "../lib/apiScanner";
import { ApiFolder } from "../../types";

export function registerApiExplorerHandlers() {
  ipcMain.handle("api-explorer:scan-project", async (_, projectPath: string) => {
    console.log(`[IPC] Received scan-project request for: ${projectPath}`);
    if (!projectPath) {
        return { tree: [], logs: ["No project path provided"] };
    }
    
    try {
      const result = await scanProjectForRoutes(projectPath);
      return result;
    } catch (err) {
      console.error("Scan failed", err);
      return { tree: [], logs: [`Scan failed: ${err}`] };
    }
  });
}
