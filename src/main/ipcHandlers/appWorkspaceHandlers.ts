import { ipcMain, shell } from "electron";
import { spawn, exec } from "child_process";
import Store from "electron-store";
import { StoreType, AppWorkspace } from "../../types";
import { join } from "path";
import fs from "fs";

export const registerAppWorkspaceHandlers = (store: Store<StoreType>, getMainWindow: () => Electron.BrowserWindow | null) => {
  // Fix TS types for store access
  const s = store as any;

  // GET
  ipcMain.handle("app-workspace:get-all", () => {
    return s.get("appWorkspaces", []);
  });

  // CREATE
  ipcMain.handle("app-workspace:create", (_, workspace: AppWorkspace) => {
    const current = s.get("appWorkspaces", []);
    const updated = [...current, workspace];
    s.set("appWorkspaces", updated);
    getMainWindow()?.webContents.send("app-workspaces-loaded", updated);
    return workspace;
  });

  // UPDATE
  ipcMain.handle("app-workspace:update", (_, workspace: AppWorkspace) => {
    const current = s.get("appWorkspaces", []);
    const index = current.findIndex((w: AppWorkspace) => w.id === workspace.id);
    if (index !== -1) {
      current[index] = workspace;
      s.set("appWorkspaces", current);
      getMainWindow()?.webContents.send("app-workspaces-loaded", current);
    }
    return workspace;
  });

  // DELETE
  ipcMain.handle("app-workspace:delete", (_, id: string) => {
    const current = s.get("appWorkspaces", []);
    const updated = current.filter((w: AppWorkspace) => w.id !== id);
    s.set("appWorkspaces", updated);
    getMainWindow()?.webContents.send("app-workspaces-loaded", updated);
  });

  // --- LAUNCHER LOGIC ---
  ipcMain.handle("app-workspace:launch", async (_, workspaceId: string) => {
    const workspace = s.get("appWorkspaces", []).find((w: AppWorkspace) => w.id === workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    console.log(`[Launcher] Starting Workspace: ${workspace.name}`);

    // 1. Launch VS Code Projects
    for (const projectId of workspace.projectIds) {
      const project = s.get("projects", []).find((p: any) => p.id === projectId);
      if (project) {
        console.log(`Open VS Code: ${project.path}`);
        exec(`code "${project.path}"`);
         // Optional: Start dev server? (Feature for later)
      }
    }
    
    // 2. Launch .code-workspace files
    for (const wsFileId of workspace.vsCodeWorkspaceIds) {
        const wsFile = s.get("workspaces", []).find((w: any) => w.id === wsFileId);
        if (wsFile) {
            console.log(`Open Workspace File: ${wsFile.path}`);
            exec(`code "${wsFile.path}"`);
        }
    }

    // 3. Launch Browsers / URLs
    for (const browserEntry of workspace.browsers) {
        // Simple implementation: Just open URLs with default browser or specific if possible
        // Opening a specific browser (Chrome/Edge) with exact tabs is complex cross-platform.
        // We will use 'start chrome url1 url2' on Windows
        
        const urls = browserEntry.urls.join(" ");
        if (urls.trim().length === 0) continue;

        if (process.platform === "win32") {
            let cmd = `start ${urls}`; // Default
            if (browserEntry.type === 'chrome') cmd = `start chrome ${urls}`;
            if (browserEntry.type === 'edge') cmd = `start msedge ${urls}`;
            if (browserEntry.type === 'firefox') cmd = `start firefox ${urls}`;
            
            if (browserEntry.usePrivateWindow) {
                 if (browserEntry.type === 'chrome') cmd = `start chrome --incognito ${urls}`;
                 // ... other flags
            }
            exec(cmd);
        } else {
             // Fallback for Mac/Linux (just open external)
             browserEntry.urls.forEach(url => shell.openExternal(url));
        }
    }

    // 4. Launch Apps
    for (const app of workspace.apps) {
        if (!app.path) continue;
        console.log(`Launching App: ${app.path}`);
        
        // Use 'start "" "path"' on windows to detach
        if (process.platform === "win32") {
             exec(`start "" "${app.path}"`);
        } else {
             shell.openPath(app.path);
        }
    }

    // Update 'lastUsedAt'
    const current = s.get("appWorkspaces", []);
    const index = current.findIndex((w: AppWorkspace) => w.id === workspaceId);
    if (index !== -1) {
        current[index].lastUsedAt = Date.now();
        s.set("appWorkspaces", current);
        getMainWindow()?.webContents.send("app-workspaces-loaded", current);
    }

    return { success: true };
  });
};
