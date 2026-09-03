import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "pathe";
import { defineConfig } from "vite";

const webAppDir = import.meta.dirname;

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), tanstackRouter({}), react()],
  resolve: {
    alias: {
      "@": path.resolve(webAppDir, "./src"),
    },
  },
});
