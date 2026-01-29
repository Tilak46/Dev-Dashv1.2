import { ipcMain, BrowserWindow } from "electron";
import Store from "electron-store";
import kill from "tree-kill";
import { spawn, ChildProcess } from "node:child_process";
import AnsiToHtml from "ansi-to-html";
import type { Project, Group, StoreType } from "../../types"; // Adjust path as needed

function killProcessTree(pid: number, signal: string = "SIGKILL") {
  return new Promise<void>((resolve, reject) => {
    try {
      kill(pid, signal as any, (err) => {
        if (err) reject(err);
        else resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Manage runningProcesses HERE
const runningProcesses: Record<string, ChildProcess> = {};
const convert = new AnsiToHtml({ fg: "#c0caf5", bg: "#1a1b26" });

// Store references passed from main.ts
let getMainWindow: () => BrowserWindow | null;
let updateWorkspaceFileFn: (
  group: Group,
  projectsInGroup: Project[],
) => Promise<void>;
let mainStore: Store<StoreType>; // Reference to the main store instance

// Export cleanup function
export function killAllRunningProcesses() {
  const pidsToKill = Object.entries(runningProcesses).map(([id, process]) => ({
    id,
    pid: process.pid,
  }));
  console.log(`Attempting to kill ${pidsToKill.length} processes on exit.`);
  pidsToKill.forEach(({ id, pid }) => {
    if (pid) {
      console.log(`Killing process for project ID: ${id} with PID: ${pid}`);
      try {
        // Using tree-kill's synchronous kill if possible on exit might be faster,
        // but async is generally safer. Stick with async kill.
        kill(pid, "SIGKILL", (err) => {
          if (err) {
            // Log error, but don't prevent app exit
            console.error(
              `Failed to kill process tree for PID ${pid} on exit:`,
              err,
            );
          } else {
            console.log(
              `Successfully killed process tree for PID ${pid} on exit.`,
            );
          }
        });
      } catch (error) {
        console.error(
          `Error attempting to kill process tree for PID ${pid} on exit:`,
          error,
        );
      }
    } else {
      console.warn(`Process for project ID ${id} had no PID during shutdown.`);
    }
  });
  // Clear the object immediately after initiating kills
  for (const key in runningProcesses) {
    delete runningProcesses[key];
  }
}

export function registerProjectHandlers(
  store: Store<StoreType>, // Receive the store instance
  getMainWindowFn: () => BrowserWindow | null,
  updateWorkspaceFile: (
    group: Group,
    projectsInGroup: Project[],
  ) => Promise<void>,
) {
  mainStore = store; // Store the reference
  getMainWindow = getMainWindowFn;
  updateWorkspaceFileFn = updateWorkspaceFile;

  // Snapshot APIs (used by Ghost window to avoid event-race issues)
  ipcMain.handle("projects:get", async () => {
    return (mainStore as any).get("projects") as Project[];
  });

  ipcMain.handle("servers:running-snapshot", async () => {
    // Map of projectId -> status
    const snapshot: Record<string, "running"> = {};
    Object.keys(runningProcesses).forEach((id) => {
      snapshot[id] = "running";
    });
    return snapshot;
  });

  ipcMain.on("project:add", (_event, project: Project) => {
    const projects = (mainStore as any).get("projects") as Project[];
    projects.push(project);
    (mainStore as any).set("projects", projects);
    getMainWindow()?.webContents.send("projects-loaded", projects);

    if (project.groupId) {
      const groups = (mainStore as any).get("groups") as Group[];
      const group = groups.find((g) => g.id === project.groupId);
      if (group) {
        const projectsInGroup = projects.filter((p) => p.groupId === group.id);
        updateWorkspaceFileFn(group, projectsInGroup); // Call directly
      }
    }
  });

  ipcMain.on("project:remove", (_event, projectId: string) => {
    const projects = (mainStore as any).get("projects") as Project[];
    const projectToRemove = projects.find((p) => p.id === projectId);
    const groupId = projectToRemove?.groupId;

    if (runningProcesses[projectId]) {
      kill(runningProcesses[projectId].pid!);
      delete runningProcesses[projectId];
    }

    const updatedProjects = projects.filter((p) => p.id !== projectId);
    (mainStore as any).set("projects", updatedProjects);
    getMainWindow()?.webContents.send("projects-loaded", updatedProjects);

    if (groupId) {
      const groups = (mainStore as any).get("groups") as Group[];
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        const projectsInGroup = updatedProjects.filter(
          (p) => p.groupId === group.id,
        );
        updateWorkspaceFileFn(group, projectsInGroup); // Call directly
      }
    }
  });

  ipcMain.on("project:update", (_event, project: Project) => {
    const projects = (mainStore as any).get("projects") as Project[];
    const index = projects.findIndex((p) => p.id === project.id);
    let oldGroupId: string | null | undefined = null;

    if (index !== -1) {
      oldGroupId = projects[index].groupId;
      projects[index] = project;
      (mainStore as any).set("projects", projects);
      getMainWindow()?.webContents.send("projects-loaded", projects);

      // Call updateWorkspaceFile directly for affected groups
      const groups = (mainStore as any).get("groups") as Group[];
      const currentGroup = groups.find((g) => g.id === project.groupId);
      const previousGroup = groups.find((g) => g.id === oldGroupId);
      const updatedProjectsForFiltering = (mainStore as any).get(
        "projects",
      ) as Project[]; // Re-fetch for accuracy

      if (currentGroup && currentGroup.id !== oldGroupId) {
        const projectsInCurrentGroup = updatedProjectsForFiltering.filter(
          (p) => p.groupId === currentGroup.id,
        );
        updateWorkspaceFileFn(currentGroup, projectsInCurrentGroup);
      }
      if (previousGroup && previousGroup.id !== project.groupId) {
        const projectsInPreviousGroup = updatedProjectsForFiltering.filter(
          (p) => p.groupId === previousGroup.id,
        );
        updateWorkspaceFileFn(previousGroup, projectsInPreviousGroup);
      }
    }
  });

  ipcMain.on("project:toggle-server", (_event, project: Project) => {
    const { id, path, startCommand, name } = project;
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    if (runningProcesses[id]) {
      mainWindow.webContents.send("server-status-changed", {
        projectId: id,
        status: "stopping",
      });
      kill(runningProcesses[id].pid!, (err) => {
        if (err) console.error(`Failed to kill process for ${name}:`, err);
        // The 'close' event will send the final 'stopped' status
      });
      return;
    }

    mainWindow.webContents.send("server-status-changed", {
      projectId: id,
      status: "starting",
    });
    mainWindow.webContents.send("terminal-log-clear", { projectId: id }); // Clear logs on start

    const [command, ...args] = startCommand.split(" ");
    try {
      // Ensure stdio is piped to capture output/errors
      const serverProcess = spawn(command, args, {
        cwd: path,
        shell: true,
        stdio: "pipe",
      });
      runningProcesses[id] = serverProcess;

      serverProcess.on("spawn", () => {
        mainWindow.webContents.send("server-status-changed", {
          projectId: id,
          status: "running",
        });
      });

      let urlFound = false;
      const handleLog = (data: Buffer | string) => {
        // Accept string or Buffer
        const log = data.toString();
        if (!urlFound) {
          const urlMatch = log.match(/(https?:\/\/[\w.-]+:\d+)/); // Use slightly broader regex
          if (urlMatch) {
            urlFound = true;
            mainWindow.webContents.send("server-url-found", {
              projectId: id,
              url: urlMatch[0],
            });
          }
        }
        mainWindow.webContents.send("terminal-log", {
          projectId: id,
          log: convert.toHtml(log),
        });
      };

      // Attach listeners correctly
      serverProcess.stdout?.on("data", handleLog);
      serverProcess.stderr?.on("data", handleLog);

      serverProcess.on("error", (err) => {
        console.error(`Failed to start server for ${name}:`, err);
        delete runningProcesses[id]; // Clean up on error
        mainWindow.webContents.send("server-status-changed", {
          projectId: id,
          status: "stopped",
        });
        mainWindow.webContents.send("terminal-log", {
          projectId: id,
          log: `\n<span style="color: #f7768e">Error starting server: ${err.message}</span>\n`,
        });
      });

      serverProcess.on("close", (code, signal) => {
        // Include signal for more info
        console.log(
          `Server process for ${name} closed with code ${code}, signal ${signal}`,
        );
        delete runningProcesses[id]; // Clean up on close
        mainWindow.webContents.send("server-status-changed", {
          projectId: id,
          status: "stopped",
        });
        if (code !== 0 && code !== null) {
          // Log non-zero exit codes
          mainWindow.webContents.send("terminal-log", {
            projectId: id,
            log: `\n<span style="color: #f7768e">Server process exited unexpectedly with code ${code} (signal: ${signal})</span>\n`,
          });
        }
      });
    } catch (err: any) {
      console.error(`Spawn error for ${name}:`, err);
      // No runningProcesses entry assigned if spawn throws immediately
      mainWindow.webContents.send("server-status-changed", {
        projectId: id,
        status: "stopped",
      });
      mainWindow.webContents.send("terminal-log", {
        projectId: id,
        log: `\n<span style="color: #f7768e">Failed to spawn process: ${err.message}</span>\n`,
      });
    }
  });

  ipcMain.on("project:restart", (_event, project: Project) => {
    const { id, name } = project;
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    if (runningProcesses[id]) {
      mainWindow.webContents.send("server-status-changed", {
        projectId: id,
        status: "stopping",
      });
      runningProcesses[id].once("close", () => {
        // Ensure the process is fully gone from our record before restarting
        delete runningProcesses[id];
        setTimeout(() => {
          console.log(`Restarting server for ${name} after close event.`);
          ipcMain.emit("project:toggle-server", null, project);
        }, 100);
      });
      kill(runningProcesses[id].pid!, (err) => {
        if (err) {
          console.error(
            `Failed to kill process during restart for ${name}:`,
            err,
          );
          // If kill fails, we might get stuck in 'stopping'. Reset status?
          // The 'close' event might still fire depending on the error.
          // Let's ensure cleanup happens even if kill errors out but process somehow closes.
          if (!runningProcesses[id]?.killed) {
            // Check if it wasn't killed successfully by close handler yet
            delete runningProcesses[id];
            mainWindow.webContents.send("server-status-changed", {
              projectId: id,
              status: "stopped",
            });
          }
        }
      });
    } else {
      console.log(
        `Server for ${name} was not running, starting instead of restarting.`,
      );
      ipcMain.emit("project:toggle-server", null, project);
    }
  });

  ipcMain.on("terminal-log-clear", (_event, projectId: string) => {
    getMainWindow()?.webContents.send("terminal-log-clear", { projectId });
  });

  // Listener for Ghost Window ready - refire running status
  ipcMain.on("internal:ghost-window-ready", () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    Object.entries(runningProcesses).forEach(([id, _process]) => {
      console.log(`Syncing running status for ${id} to new window`);
      mainWindow.webContents.send("server-status-changed", {
        projectId: id,
        status: "running",
      });
    });
  });

  // Force Kill All Node Processes (Panic Button)
  ipcMain.handle("app:force-kill-node", async () => {
    const entries = Object.entries(runningProcesses)
      .map(([id, proc]) => ({ id, pid: proc.pid }))
      .filter((x) => typeof x.pid === "number");

    // 1) Prefer killing ONLY processes launched/tracked by DevDash.
    const killTrackedResults = await Promise.allSettled(
      entries.map(async ({ pid }) => {
        await killProcessTree(pid!, "SIGKILL");
      }),
    );

    // Clear our local tracking and notify UI regardless.
    const ids = Object.keys(runningProcesses);
    ids.forEach((id) => {
      delete runningProcesses[id];
      getMainWindow()?.webContents.send("server-status-changed", {
        projectId: id,
        status: "stopped",
      });
    });

    const trackedKillFailed = killTrackedResults.some(
      (r) => r.status === "rejected",
    );

    // 2) If nothing was tracked (or tracked kill failed), do a best-effort panic kill for Node.
    // This is intentionally a fallback, because killing all node.exe can impact unrelated tools.
    if (entries.length === 0 || trackedKillFailed) {
      return await new Promise<boolean>((resolve) => {
        const cmd =
          process.platform === "win32"
            ? "taskkill /F /IM node.exe /T"
            : "pkill -f node";
        const child = spawn(cmd, { shell: true });
        child.on("close", (code) => resolve(code === 0));
        child.on("error", () => resolve(false));
      });
    }

    return !trackedKillFailed;
  });
}
