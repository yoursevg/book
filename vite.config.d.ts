import type { UserConfig } from "vite";

// Type declaration for the Vite configuration exported from `vite.config.js`.
// This allows TypeScript to understand the shape of the config when importing it
// from TypeScript files (e.g., `server/vite.ts`).
declare const config: UserConfig;
export default config;
