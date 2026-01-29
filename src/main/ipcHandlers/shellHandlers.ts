import { ipcMain, shell } from "electron";
import { exec } from "node:child_process";

export function registerShellHandlers() {
  ipcMain.on("shell:openExternal", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on("shell:openPath", (_event, path: string) => {
    shell.openPath(path);
  });

  ipcMain.on("shell:openVSCode", (_event, path: string) => {
    exec("code .", { cwd: path }, (error) => {
      if (error) {
        console.error(`Failed to open VS Code in ${path}: ${error}`);
      }
    });
  });

  ipcMain.on("shell:showItemInFolder", (_event, path: string) => {
    shell.showItemInFolder(path);
  });
}
