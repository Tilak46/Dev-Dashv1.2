import type {
  Project,
  Group,
  ProjectStatus,
  Workspace,
  WorkspaceSettings,
  GitSummary,
} from "@/../types"; // Corrected path alias

type GitExecResult = { code: number; stdout: string; stderr: string };

// Define the shape of the API exposed by the preload script
// This should exactly match the 'api' object in src/preload/index.ts
interface ElectronApi {
  // Project List Management
  onProjectsLoaded: (callback: (projects: Project[]) => void) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  updateProject: (project: Project) => void;
  openDirectoryDialog: () => Promise<string | null>;

  // Server Management
  toggleServer: (project: Project) => void;
  restartProject: (project: Project) => void;
  onServerStatusChanged: (
    callback: (args: { projectId: string; status: ProjectStatus }) => void,
  ) => void;
  onTerminalLog: (
    callback: (args: { projectId: string; log: string }) => void,
  ) => void;
  onServerUrlFound: (
    callback: (args: { projectId: string; url: string }) => void,
  ) => void;

  // Shell/External Actions
  openExternal: (url: string) => void;
  openPath: (path: string) => void;
  openVSCode: (path: string) => void;
  showItemInFolder: (path: string) => void; // <-- ADDED

  // Log Management
  clearLogs: (projectId: string) => void;
  onClearLogs: (callback: (args: { projectId: string }) => void) => void;

  // Group Management
  onGroupsLoaded: (callback: (groups: Group[]) => void) => void;
  addGroup: (groupName: string) => void;
  deleteGroup: (groupId: string) => void;
  assignProjectToGroup: (projectId: string, groupId: string | null) => void;

  // Settings Management
  getSettings: () => void;
  onSettingsLoaded: (callback: (settings: WorkspaceSettings) => void) => void; // Use WorkspaceSettings
  onSettingsUpdated: (callback: (settings: WorkspaceSettings) => void) => void; // Use WorkspaceSettings
  toggleWorkspaceManagement: (enabled: boolean) => void;
  selectWorkspacePath: () => Promise<string | null>;

  // Workspace Management (Group Linking & Tab)
  openWorkspace: (workspacePath: string) => void;
  onWorkspacesLoaded: (callback: (workspaces: Workspace[]) => void) => void;
  addWorkspace: (workspacePath: string) => void;
  removeWorkspace: (workspaceId: string) => void;
  selectWorkspaceFile: () => Promise<string | null>;
  updateWorkspace: (
    workspaceUpdate: Partial<Workspace> & { id: string },
  ) => void; // <-- ADDED

  // Git Management
  getGitSummary: (projectPath: string) => Promise<GitSummary>;
  gitPull: (projectPath: string) => Promise<GitExecResult>;
  gitPush: (projectPath: string) => Promise<GitExecResult>;
  gitCheckout: (projectPath: string, branch: string) => Promise<GitExecResult>;
  gitRestoreAll: (projectPath: string) => Promise<GitExecResult>;
  gitStageFile: (
    projectPath: string,
    filePath: string,
    stage: boolean,
  ) => Promise<GitExecResult>;
  gitStageAll: (projectPath: string) => Promise<GitExecResult>;
  gitUnstageAll: (projectPath: string) => Promise<GitExecResult>;
  gitCommit: (projectPath: string, message: string) => Promise<GitExecResult>;
  onGitSummaryUpdated: (
    callback: (args: { projectId: string; summary: GitSummary }) => void,
  ) => void;
}

// Access the exposed API, handling potential undefined errors during build/lint
const fallbackApi: ElectronApi = {
  // Provide dummy functions during build time or if preload fails
  onProjectsLoaded: () => console.warn("API not ready"),
  addProject: () => console.warn("API not ready"),
  removeProject: () => console.warn("API not ready"),
  updateProject: () => console.warn("API not ready"),
  openDirectoryDialog: async () => {
    console.warn("API not ready");
    return null;
  },
  toggleServer: () => console.warn("API not ready"),
  restartProject: () => console.warn("API not ready"),
  onServerStatusChanged: () => console.warn("API not ready"),
  onTerminalLog: () => console.warn("API not ready"),
  onServerUrlFound: () => console.warn("API not ready"),
  openExternal: () => console.warn("API not ready"),
  openPath: () => console.warn("API not ready"),
  openVSCode: () => console.warn("API not ready"),
  showItemInFolder: () => console.warn("API not ready"), // <-- ADDED Dummy
  clearLogs: () => console.warn("API not ready"),
  onClearLogs: () => console.warn("API not ready"),
  onGroupsLoaded: () => console.warn("API not ready"),
  addGroup: () => console.warn("API not ready"),
  deleteGroup: () => console.warn("API not ready"),
  assignProjectToGroup: () => console.warn("API not ready"),
  getSettings: () => console.warn("API not ready"),
  onSettingsLoaded: () => console.warn("API not ready"),
  onSettingsUpdated: () => console.warn("API not ready"),
  toggleWorkspaceManagement: () => console.warn("API not ready"),
  selectWorkspacePath: async () => {
    console.warn("API not ready");
    return null;
  },
  openWorkspace: () => console.warn("API not ready"),
  onWorkspacesLoaded: () => console.warn("API not ready"),
  addWorkspace: () => console.warn("API not ready"),
  removeWorkspace: () => console.warn("API not ready"),
  selectWorkspaceFile: async () => {
    console.warn("API not ready");
    return null;
  },
  updateWorkspace: () => console.warn("API not ready"), // <-- ADDED Dummy

  // Git Management
  getGitSummary: async () => {
    console.warn("API not ready");
    return {
      isRepo: false,
      branch: null,
      upstream: null,
      aheadBehind: null,
      changeCount: 0,
      files: [],
      branches: [],
      lastRefreshedAt: Date.now(),
      error: "API not ready",
    };
  },
  gitPull: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  gitPush: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  gitCheckout: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  gitRestoreAll: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  gitStageFile: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  gitStageAll: async () => {
    console.warn("API not ready");
    return {
      code: 1,
      stdout: "",
      stderr: "API not ready (restart the app to load updated preload)",
    };
  },
  gitUnstageAll: async () => {
    console.warn("API not ready");
    return {
      code: 1,
      stdout: "",
      stderr: "API not ready (restart the app to load updated preload)",
    };
  },
  gitCommit: async () => {
    console.warn("API not ready");
    return { code: 1, stdout: "", stderr: "API not ready" };
  },
  onGitSummaryUpdated: () => console.warn("API not ready"),
};

const apiClient: ElectronApi = {
  ...fallbackApi,
  ...(((window as any).api as Partial<ElectronApi>) ?? {}),
} as ElectronApi;

export default apiClient;
