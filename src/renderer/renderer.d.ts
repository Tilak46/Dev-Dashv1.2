// src/renderer/renderer.d.ts

import { api } from "../preload";

// This tells TypeScript that the global 'Window' object
// will now have a property called 'api' with the same shape
// as the 'api' object we defined in our preload script.
declare global {
  interface Window {
    api: typeof api;
  }
}
