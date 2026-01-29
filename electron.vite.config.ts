import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    // Main process config
  },
  preload: {
    // Preload script config
  },
  renderer: {
    root: "src/renderer",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
          ghost: resolve(__dirname, "src/renderer/ghost.html"),
        },
      },
    },
    // THIS IS THE CRUCIAL FIX
    resolve: {
      alias: {
        // Tell Vite that '@/' maps to the 'src/renderer' folder
        "@": resolve(__dirname, "src/renderer"),
      },
    },
    plugins: [react()],
  },
});
