import { contextBridge, ipcRenderer } from "electron";
import type {
  Project,
  Group,
  ProjectStatus,
  Workspace,
  WorkspaceSettings,
  GitSummary,
} from "../types"; // Use WorkspaceSettings

export const api = {
  // --- Project List Management ---
  onProjectsLoaded: (callback: (projects: Project[]) => void) => {
    ipcRenderer.on("projects-loaded", (_event, projects) => callback(projects));
  },
  addProject: (project: Project) => {
    ipcRenderer.send("project:add", project);
  },
  removeProject: (projectId: string) => {
    ipcRenderer.send("project:remove", projectId);
  },
  updateProject: (project: Project) => {
    ipcRenderer.send("project:update", project);
  },
  openDirectoryDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke("dialog:openDirectory");
  },

  // --- Server Management ---
  toggleServer: (project: Project) => {
    ipcRenderer.send("project:toggle-server", project);
  },
  restartProject: (project: Project) => {
    ipcRenderer.send("project:restart", project);
  },
  onServerStatusChanged: (
    callback: (args: { projectId: string; status: ProjectStatus }) => void,
  ) => {
    ipcRenderer.on("server-status-changed", (_event, args) => callback(args));
  },
  onTerminalLog: (
    callback: (args: { projectId: string; log: string }) => void,
  ) => {
    ipcRenderer.on("terminal-log", (_event, args) => callback(args));
  },
  onServerUrlFound: (
    callback: (args: { projectId: string; url: string }) => void,
  ) => {
    ipcRenderer.on("server-url-found", (_event, args) => callback(args));
  },

  // --- Shell/External Actions ---
  openExternal: (url: string) => {
    ipcRenderer.send("shell:openExternal", url);
  },
  openPath: (path: string) => {
    ipcRenderer.send("shell:openPath", path);
  },
  openVSCode: (path: string) => {
    ipcRenderer.send("shell:openVSCode", path);
  },
  // *** ADDED showItemInFolder to exposed API ***
  showItemInFolder: (path: string) => {
    ipcRenderer.send("shell:showItemInFolder", path);
  },

  // --- Log Management ---
  clearLogs: (projectId: string) => {
    ipcRenderer.send("terminal-log-clear", projectId);
  },
  onClearLogs: (callback: (args: { projectId: string }) => void) => {
    ipcRenderer.on("terminal-log-clear", (_event, args) => callback(args));
  },

  // --- Group Management ---
  onGroupsLoaded: (callback: (groups: Group[]) => void) => {
    ipcRenderer.on("groups-loaded", (_event, groups) => callback(groups));
  },
  addGroup: (groupName: string) => {
    ipcRenderer.send("group:add", groupName);
  },
  deleteGroup: (groupId: string) => {
    ipcRenderer.send("group:delete", groupId);
  },
  assignProjectToGroup: (projectId: string, groupId: string | null) => {
    ipcRenderer.send("project:assign-group", { projectId, groupId });
  },

  // --- Settings Management ---
  getSettings: () => {
    ipcRenderer.send("settings:get");
  },
  onSettingsLoaded: (callback: (settings: WorkspaceSettings) => void) => {
    // Use WorkspaceSettings
    ipcRenderer.on("settings-loaded", (_event, settings) => callback(settings));
  },
  onSettingsUpdated: (callback: (settings: WorkspaceSettings) => void) => {
    // Use WorkspaceSettings
    ipcRenderer.on("settings-updated", (_event, settings) =>
      callback(settings),
    );
  },
  toggleWorkspaceManagement: (enabled: boolean) => {
    ipcRenderer.send("settings:toggle-workspaces", enabled);
  },
  selectWorkspacePath: (): Promise<string | null> => {
    return ipcRenderer.invoke("settings:select-workspace-path");
  },

  // --- Workspace Management (Group Linking & Tab) ---
  openWorkspace: (workspacePath: string) => {
    ipcRenderer.send("workspace:open", workspacePath);
  },
  onWorkspacesLoaded: (callback: (workspaces: Workspace[]) => void) => {
    ipcRenderer.on("workspaces-loaded", (_event, workspaces) =>
      callback(workspaces),
    );
  },
  addWorkspace: (workspacePath: string) => {
    ipcRenderer.send("workspace:add", workspacePath);
  },
  removeWorkspace: (workspaceId: string) => {
    ipcRenderer.send("workspace:remove", workspaceId);
  },
  selectWorkspaceFile: (): Promise<string | null> => {
    return ipcRenderer.invoke("dialog:openWorkspaceFile");
  },
  // *** ADDED updateWorkspace to exposed API ***
  updateWorkspace: (workspaceUpdate: Partial<Workspace> & { id: string }) => {
    ipcRenderer.send("workspace:update", workspaceUpdate);
  },

  // --- Git Management ---
  getGitSummary: (projectPath: string): Promise<GitSummary> => {
    return ipcRenderer.invoke("git:summary", projectPath);
  },
  gitPull: (projectPath: string) => {
    return ipcRenderer.invoke("git:pull", projectPath);
  },
  gitPush: (projectPath: string) => {
    return ipcRenderer.invoke("git:push", projectPath);
  },
  gitCheckout: (projectPath: string, branch: string) => {
    return ipcRenderer.invoke("git:checkout", projectPath, branch);
  },
  gitRestoreAll: (projectPath: string) => {
    return ipcRenderer.invoke("git:restore-all", projectPath);
  },
  gitStageFile: (projectPath: string, filePath: string, stage: boolean) => {
    return ipcRenderer.invoke("git:stage-file", projectPath, filePath, stage);
  },
  gitStageAll: (projectPath: string) => {
    return ipcRenderer.invoke("git:stage-all", projectPath);
  },
  gitUnstageAll: (projectPath: string) => {
    return ipcRenderer.invoke("git:unstage-all", projectPath);
  },
  gitCommit: (projectPath: string, message: string) => {
    return ipcRenderer.invoke("git:commit", projectPath, message);
  },
  onGitSummaryUpdated: (
    callback: (args: { projectId: string; summary: GitSummary }) => void,
  ) => {
    ipcRenderer.on("git:summary-updated", (_event, args) => callback(args));
  },
};

// Expose the API to the renderer process via contextBridge
contextBridge.exposeInMainWorld("api", api);
