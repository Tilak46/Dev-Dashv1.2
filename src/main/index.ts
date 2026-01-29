import { app, BrowserWindow, shell } from "electron"; // 1. Added shell import
import { join } from "node:path";
import fs from "node:fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import Store from "electron-store";
import type { Project, Group, StoreType } from "../types";

// Import handler registration functions
import {
  registerProjectHandlers,
  killAllRunningProcesses,
} from "./ipcHandlers/projectHandlers";
import { registerGroupHandlers } from "./ipcHandlers/groupHandlers";
import { registerWorkspaceHandlers } from "./ipcHandlers/workspaceHandlers";
import { registerSettingsHandlers } from "./ipcHandlers/settingsHandlers";
import { registerShellHandlers } from "./ipcHandlers/shellHandlers";
import { registerDialogHandlers } from "./ipcHandlers/dialogHandlers";
import { registerGitHandlers } from "./ipcHandlers/gitHandlers";

// Initialize Store
const store = new Store<StoreType>({
  defaults: {
    projects: [],
    groups: [],
    settings: {
      manageWorkspaces: false,
      workspaceSavePath: null,
    },
    workspaces: [],
  },
});

// Helper to get main window
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

// Helper function to update workspace file
async function updateWorkspaceFile(group: Group, projectsInGroup: Project[]) {
  const manageWorkspaces = (store as any).get("settings.manageWorkspaces");
  if (!manageWorkspaces || !group.workspacePath) return;
  const workspaceData = {
    folders: projectsInGroup.map((p) => ({ path: p.path })),
  };
  try {
    const dirPath = join(group.workspacePath, "..");
    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(
      group.workspacePath,
      JSON.stringify(workspaceData, null, 2),
    );
    console.log(`Updated workspace file: ${group.workspacePath}`);
  } catch (error) {
    console.error(
      `Failed to write workspace file ${group.workspacePath}:`,
      error,
    );
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send(
      "projects-loaded",
      (store as any).get("projects"),
    );
    mainWindow.webContents.send("groups-loaded", (store as any).get("groups"));
    mainWindow.webContents.send(
      "settings-loaded",
      (store as any).get("settings"),
    );
    mainWindow.webContents.send(
      "workspaces-loaded",
      (store as any).get("workspaces"),
    );
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // 3. REMOVED incorrect webContents.on listeners for workspace updates

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron");

  // Register all IPC handlers, passing dependencies
  registerProjectHandlers(store, getMainWindow, updateWorkspaceFile); // Pass update function to project handlers too
  registerGroupHandlers(store, getMainWindow, updateWorkspaceFile);
  registerWorkspaceHandlers(store, getMainWindow);
  registerSettingsHandlers(store, getMainWindow, updateWorkspaceFile);
  registerDialogHandlers(getMainWindow);
  registerGitHandlers(store, getMainWindow);
  registerShellHandlers();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 4. UPDATED will-quit handler
app.on("will-quit", () => {
  console.log("App quitting, terminating running processes...");
  killAllRunningProcesses(); // Call the exported function from projectHandlers
});
