import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the built shell works when loaded from file:// inside Tauri webview
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", sourcemap: false },
});
