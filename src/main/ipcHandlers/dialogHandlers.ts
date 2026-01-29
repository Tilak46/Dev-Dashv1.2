import { BrowserWindow, dialog, ipcMain } from "electron";

let getMainWindow: () => BrowserWindow | null;

export function registerDialogHandlers(
  getMainWindowFn: () => BrowserWindow | null,
) {
  getMainWindow = getMainWindowFn;

  ipcMain.handle("dialog:openDirectory", async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Select Project Folder",
      properties: ["openDirectory"],
    });

    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });
}
