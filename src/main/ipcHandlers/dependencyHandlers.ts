import { ipcMain } from "electron";
import { join } from "node:path";
import fs from "node:fs/promises";

export function registerDependencyHandlers() {
  ipcMain.handle("project:get-dependencies", async (_event, projectPath: string) => {
    try {
      const packageJsonPath = join(projectPath, "package.json");
      const content = await fs.readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);
      return {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      };
    } catch (error) {
      console.error(`Failed to read package.json at ${projectPath}`, error);
      return null;
    }
  });
}
