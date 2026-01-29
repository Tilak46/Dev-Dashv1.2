import { ipcMain, BrowserWindow, dialog } from "electron";
import Store from "electron-store";
import { join, basename } from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import type { Workspace, StoreType } from "../../types"; // Adjust path

let getMainWindow: () => BrowserWindow | null;

export function registerWorkspaceHandlers(
  store: Store<StoreType>,
  getMainWindowFn: () => BrowserWindow | null
) {
  getMainWindow = getMainWindowFn;

  ipcMain.on("workspaces:get", (_event) => {
    _event.sender.send("workspaces-loaded", (store as any).get("workspaces"));
  });

  ipcMain.handle("dialog:openWorkspaceFile", async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Select VS Code Workspace File",
      filters: [{ name: "VS Code Workspace", extensions: ["code-workspace"] }],
      properties: ["openFile"],
    });
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });

  ipcMain.on("workspace:add", async (_event, workspacePath: string) => {
    if (!workspacePath) return;
    const workspaces = (store as any).get("workspaces") as Workspace[];
    if (workspaces.some((w) => w.path === workspacePath)) return;

    let folderCount = 0;
    try {
      const content = await fs.promises.readFile(workspacePath, "utf-8");
      const workspaceData = JSON.parse(content);
      if (Array.isArray(workspaceData.folders)) {
        folderCount = workspaceData.folders.length;
      }
    } catch (error) {
      console.error(
        `Failed to read or parse workspace file ${workspacePath}:`,
        error
      );
    }

    const name = basename(workspacePath).replace(".code-workspace", "");
    const newWorkspace: Workspace = {
      id: `ws_${Date.now()}`,
      name: name,
      displayName: null,
      path: workspacePath,
      folderCount: folderCount,
      isPinned: false,
    };

    workspaces.push(newWorkspace);
    (store as any).set("workspaces", workspaces);
    _event.sender.send("workspaces-loaded", workspaces);
  });

  ipcMain.on("workspace:remove", (_event, workspaceId: string) => {
    const workspaces = (store as any).get("workspaces") as Workspace[];
    const updatedWorkspaces = workspaces.filter((w) => w.id !== workspaceId);
    (store as any).set("workspaces", updatedWorkspaces);
    _event.sender.send("workspaces-loaded", updatedWorkspaces);
  });

  ipcMain.on(
    "workspace:update",
    (_event, updatedWorkspace: Partial<Workspace> & { id: string }) => {
      const workspaces = (store as any).get("workspaces") as Workspace[];
      const index = workspaces.findIndex((w) => w.id === updatedWorkspace.id);
      if (index !== -1) {
        workspaces[index] = {
          ...workspaces[index],
          ...(updatedWorkspace.displayName !== undefined && {
            displayName: updatedWorkspace.displayName,
          }),
          ...(updatedWorkspace.isPinned !== undefined && {
            isPinned: updatedWorkspace.isPinned,
          }),
        };
        (store as any).set("workspaces", workspaces);
        _event.sender.send("workspaces-loaded", workspaces);
      }
    }
  );

  ipcMain.on("workspace:open", (_event, workspacePath: string) => {
    if (!workspacePath) return;
    exec(`code "${workspacePath}"`, (error) => {
      if (error) {
        console.error(`Failed to open workspace ${workspacePath}:`, error);
      }
    });
  });
}
