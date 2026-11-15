import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  // Relative paths, so the build works at any address (GitHub Pages, Vercel, a USB stick).
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Scenario files live in ../data, outside the ui/ folder.
  server: { fs: { allow: [".."] } },
});
