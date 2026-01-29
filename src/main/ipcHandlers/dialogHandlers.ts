import { BrowserWindow, dialog, ipcMain } from "electron";

let getMainWindow: () => BrowserWindow | null;

export function registerDialogHandlers(
  getMainWindowFn: () => BrowserWindow | null,
) {
  getMainWindow = getMainWindowFn;

  ipcMain.handle("dialog:openDirectory", async () => {
    const mainWindow = getMainWindow();
    const options = {
      title: "Select Project Folder",
      buttonLabel: "Select Folder",
      properties: ["openDirectory", "createDirectory"],
    } as const;

    const { canceled, filePaths } = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
    return null;
  });
}
