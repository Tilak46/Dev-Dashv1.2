import { useState, useEffect } from "react";
import {
  Project,
  Group,
  ProjectStatus,
  Workspace,
  WorkspaceSettings,
} from "@/../types";
import apiClient from "@/lib/apiClient";

export type ProjectState = {
  [id: string]: {
    status: ProjectStatus;
    logs: string;
    url?: string;
  };
};

export function useDataManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projectState, setProjectState] = useState<ProjectState>({});
  // Use WorkspaceSettings type here
  const [settings, setSettings] = useState<WorkspaceSettings>({
    manageWorkspaces: false,
    workspaceSavePath: null,
  });

  useEffect(() => {
    // Initial data fetch
    apiClient.getSettings();
    // Use listeners from apiClient
    apiClient.onGroupsLoaded(setGroups);
    apiClient.onProjectsLoaded((loadedProjects) => {
      setProjects(loadedProjects);
      // Consolidate state initialization/update
      setProjectState((prevState) => {
        const newState: ProjectState = {};
        loadedProjects.forEach((p) => {
          // Keep existing state if available, otherwise initialize
          newState[p.id] = prevState[p.id] || {
            status: "stopped",
            logs: "",
            url: undefined,
          };
        });
        // Clean up deleted projects from state
        Object.keys(newState).forEach((projectId) => {
          if (!loadedProjects.some((p) => p.id === projectId)) {
            delete newState[projectId];
          }
        });
        // Clean up previous state entries that are no longer in loadedProjects
        Object.keys(prevState).forEach((projectId) => {
          if (!loadedProjects.some((p) => p.id === projectId)) {
            // This check might be redundant if newState starts fresh,
            // but ensures cleanup if merging logic changes.
          }
        });
        return newState;
      });
    });
    apiClient.onWorkspacesLoaded(setWorkspaces);
    apiClient.onServerStatusChanged(({ projectId, status }) => {
      setProjectState((prevState) => {
        // Guard against updates for projects no longer in state
        if (!prevState[projectId]) return prevState;
        return {
          ...prevState,
          [projectId]: {
            ...prevState[projectId],
            status: status,
            url: status === "stopped" ? undefined : prevState[projectId]?.url,
          },
        };
      });
    });
    apiClient.onTerminalLog(({ projectId, log }) => {
      setProjectState((prevState) => {
        if (!prevState[projectId]) return prevState;
        return {
          ...prevState,
          [projectId]: {
            ...prevState[projectId],
            logs: prevState[projectId].logs + log,
          },
        };
      });
    });
    apiClient.onServerUrlFound(({ projectId, url }) => {
      setProjectState((prevState) => {
        if (!prevState[projectId]) return prevState;
        return {
          ...prevState,
          [projectId]: { ...prevState[projectId], url: url },
        };
      });
    });
    apiClient.onClearLogs(({ projectId }) => {
      setProjectState((prevState) => {
        if (!prevState[projectId]) return prevState;
        return {
          ...prevState,
          [projectId]: { ...prevState[projectId], logs: "" },
        };
      });
    });
    // Use correct type for settings listeners
    apiClient.onSettingsLoaded(setSettings);
    apiClient.onSettingsUpdated(setSettings);
  }, []); // Empty dependency array means this runs once on mount

  // --- Handlers ---
  // These functions now call methods from apiClient
  const handleSaveProject = async (
    projectName: string,
    startCommand: string,
    groupId: string | null
  ) => {
    const path = await apiClient.openDirectoryDialog();
    if (path) {
      const newProject: Project = {
        id: `proj_${Date.now()}`,
        name: projectName,
        path: path,
        startCommand: startCommand,
        groupId: groupId,
      };
      apiClient.addProject(newProject);
    }
    return !!path; // Return success status based on path selection
  };
  const handleUpdateProject = (project: Project) => {
    apiClient.updateProject(project);
  };
  const handleSaveGroup = (groupName: string) => {
    apiClient.addGroup(groupName);
  };
  const handleDeleteGroup = (groupId: string) => {
    apiClient.deleteGroup(groupId);
  };
  const handleOpenWorkspace = (workspacePath: string) => {
    apiClient.openWorkspace(workspacePath);
  };
  const handleToggleWorkspaces = (enabled: boolean) => {
    apiClient.toggleWorkspaceManagement(enabled);
  };
  const handleSelectWorkspacePath = async () => {
    const newPath = await apiClient.selectWorkspacePath();
    // Update local state optimistically, backend handles saving
    if (newPath) {
      setSettings((prev) => ({ ...prev, workspaceSavePath: newPath }));
    }
  };
  const handleAssignProjectGroup = (
    projectId: string,
    groupId: string | null
  ) => {
    apiClient.assignProjectToGroup(projectId, groupId);
  };
  const handleAddWorkspaceFile = async () => {
    const path = await apiClient.selectWorkspaceFile();
    if (path) {
      apiClient.addWorkspace(path);
    }
  };
  const handleDeleteProject = (projectId: string) => {
    apiClient.removeProject(projectId);
  };
  const handleToggleServer = (project: Project) => {
    apiClient.toggleServer(project);
  };
  const handleRestartProject = (project: Project) => {
    apiClient.restartProject(project);
  };
  const handleOpenPath = (path: string) => {
    apiClient.openPath(path);
  };
  const handleOpenVSCode = (path: string) => {
    apiClient.openVSCode(path);
  };
  const handleRemoveWorkspace = (workspaceId: string) => {
    apiClient.removeWorkspace(workspaceId);
  }; // Added remove workspace handler

  return {
    projects,
    groups,
    workspaces,
    projectState,
    settings,
    actions: {
      handleSaveProject,
      handleUpdateProject,
      handleSaveGroup,
      handleDeleteGroup,
      handleOpenWorkspace,
      handleToggleWorkspaces,
      handleSelectWorkspacePath,
      handleAssignProjectGroup,
      handleAddWorkspaceFile,
      handleDeleteProject,
      handleToggleServer,
      handleRestartProject,
      handleOpenPath,
      handleOpenVSCode,
      handleRemoveWorkspace, // Export remove workspace handler
    },
  };
}
