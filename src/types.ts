// Define the possible status values
export type ProjectStatus = "starting" | "running" | "stopping" | "stopped";

// Define the Group type
export type Group = {
  id: string;
  name: string;
  workspacePath?: string; // Optional path to the associated .code-workspace file
};

export type Project = {
  id: string;
  name: string;
  path: string;
  startCommand: string;
  groupId?: string | null; // Link to a Group ID
  status?: ProjectStatus;
  url?: string;
};

// Define the Workspace type with new properties
export type Workspace = {
  id: string; // Unique ID for storage
  name: string; // Original name (derived from path)
  displayName: string | null; // User-defined display name
  path: string; // Full path to the .code-workspace file
  folderCount: number; // Number of folders in the workspace
  isPinned: boolean; // Pinned status
};

// Define Settings type
export type WorkspaceSettings = {
  // Renamed from Settings
  manageWorkspaces: boolean;
  workspaceSavePath: string | null;
};

export type StoreType = {
  projects: Project[];
  groups: Group[];
  settings: WorkspaceSettings;
  workspaces: Workspace[];      // Legacy: .code-workspace files
  appWorkspaces: AppWorkspace[]; // New: God Mode Workspaces
};

// --- New "God Mode" Workspace Types ---

export type AppWorkspace = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  // Use existing project/workspace IDs to link them
  projectIds: string[]; 
  vsCodeWorkspaceIds: string[]; 
  
  browsers: Array<{
    id: string;
    type: 'chrome' | 'edge' | 'firefox';
    urls: string[];
    usePrivateWindow?: boolean;
  }>;

  apps: Array<{
    id: string;
    name: string;
    path: string; // Absolute path to .exe or .lnk
    args?: string;
  }>;
    
  createdAt: number;
  lastUsedAt?: number;
};

export type GitFileStatus = {
  path: string;
  indexStatus: string; // X from porcelain
  worktreeStatus: string; // Y from porcelain
  staged: boolean;
  untracked: boolean;
};

export type GitAheadBehind = {
  ahead: number;
  behind: number;
};

export type GitSummary = {
  isRepo: boolean;
  branch: string | null;
  upstream: string | null;
  aheadBehind: GitAheadBehind | null;
  changeCount: number;
  files: GitFileStatus[];
  branches: string[];
  lastRefreshedAt: number;
  error: string | null;
};

export type SystemStats = {
  at: number;
  cpu: { load: number; tempC: number | null };
  memory: { total: number; used: number; usedPercent: number };
  gpu: {
    name: string | null;
    load: number | null;
    tempC: number | null;
  } | null;
  fans: { rpm: number[] } | null;
  topProcess: { pid: number; name: string; cpu: number; mem: number } | null;
  sensors?: {
    status: "ok" | "unavailable" | "permission-denied";
    message?: string;
  };
};
