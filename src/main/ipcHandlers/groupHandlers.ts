import { ipcMain, BrowserWindow } from "electron";
import Store from "electron-store";
import { join } from "node:path";
import fs from "node:fs";
import type { Project, Group, StoreType, WorkspaceSettings } from "../../types"; // Adjust path

let getMainWindow: () => BrowserWindow | null;
let updateWorkspaceFileFn: (
  group: Group,
  projectsInGroup: Project[]
) => Promise<void>; // Function to update workspace

export function registerGroupHandlers(
  store: Store<StoreType>,
  getMainWindowFn: () => BrowserWindow | null,
  updateWorkspaceFile: (
    group: Group,
    projectsInGroup: Project[]
  ) => Promise<void>
) {
  getMainWindow = getMainWindowFn;
  updateWorkspaceFileFn = updateWorkspaceFile;

  ipcMain.on("groups:get", (_event) => {
    _event.sender.send("groups-loaded", (store as any).get("groups"));
  });

  ipcMain.on("group:add", async (_event, groupName: string) => {
    const groups = (store as any).get("groups") as Group[];
    const settings = (store as any).get("settings") as WorkspaceSettings;
    const newGroup: Group = {
      id: `group_${Date.now()}`,
      name: groupName,
    };

    if (settings.manageWorkspaces) {
      const savePath = settings.workspaceSavePath; // Path should already exist if enabled
      if (savePath) {
        newGroup.workspacePath = join(
          savePath,
          `${groupName.replace(/[^a-zA-Z0-9]/g, "_")}.code-workspace`
        );
        await updateWorkspaceFileFn(newGroup, []); // Use passed function
      } else {
        // Should ideally not happen if getWorkspaceSavePath was called on enable
        console.error("Workspace management enabled but no save path set!");
        (store as any).set("settings.manageWorkspaces", false);
        _event.sender.send("settings-updated", (store as any).get("settings"));
      }
    }

    groups.push(newGroup);
    (store as any).set("groups", groups);
    _event.sender.send("groups-loaded", groups);
  });

  ipcMain.on("group:delete", async (_event, groupId: string) => {
    const groups = (store as any).get("groups") as Group[];
    const projects = (store as any).get("projects") as Project[];
    const groupToDelete = groups.find((g) => g.id === groupId);

    const updatedGroups = groups.filter((g) => g.id !== groupId);
    (store as any).set("groups", updatedGroups);

    const updatedProjects = projects.map((p) => {
      if (p.groupId === groupId) {
        return { ...p, groupId: null };
      }
      return p;
    });
    (store as any).set("projects", updatedProjects);

    if (groupToDelete?.workspacePath) {
      try {
        await fs.promises.unlink(groupToDelete.workspacePath);
        console.log(`Deleted workspace file: ${groupToDelete.workspacePath}`);
      } catch (error) {
        console.error(
          `Failed to delete workspace file ${groupToDelete.workspacePath}:`,
          error
        );
      }
    }

    _event.sender.send("groups-loaded", updatedGroups);
    _event.sender.send("projects-loaded", updatedProjects);
  });

  ipcMain.on(
    "project:assign-group",
    async (
      _event,
      { projectId, groupId }: { projectId: string; groupId: string | null }
    ) => {
      const projects = (store as any).get("projects") as Project[];
      const groups = (store as any).get("groups") as Group[];
      let oldGroupId: string | null | undefined = null;

      const projectIndex = projects.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) return;

      oldGroupId = projects[projectIndex].groupId;
      projects[projectIndex].groupId = groupId;
      (store as any).set("projects", projects);
      _event.sender.send("projects-loaded", projects);

      // Update relevant workspace files
      const currentGroup = groups.find((g) => g.id === groupId);
      const previousGroup = groups.find((g) => g.id === oldGroupId);
      const updatedProjectsForFiltering = (store as any).get(
        "projects"
      ) as Project[]; // Re-fetch to ensure consistency

      if (currentGroup && currentGroup.id !== oldGroupId) {
        const projectsInCurrentGroup = updatedProjectsForFiltering.filter(
          (p) => p.groupId === currentGroup.id
        );
        await updateWorkspaceFileFn(currentGroup, projectsInCurrentGroup);
      }
      if (previousGroup && previousGroup.id !== groupId) {
        const projectsInPreviousGroup = updatedProjectsForFiltering.filter(
          (p) => p.groupId === previousGroup.id
        );
        await updateWorkspaceFileFn(previousGroup, projectsInPreviousGroup);
      }
    }
  );
}
