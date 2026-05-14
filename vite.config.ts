import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-start", "@tanstack/react-router"],
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      srcDirectory: "src",
      start: { entry: "start.ts" },
      router: {
        entry: "router.tsx",
        routesDirectory: "routes",
        quoteStyle: "double",
        importRoutesUsingAbsolutePaths: false,
        // TanStack's path-based `import()` splits break when the repo path contains `'`
        // (e.g. Ronin's Gambit). Keep a single client chunk unless the folder is renamed.
        autoCodeSplitting: false,
        codeSplittingOptions: {
          defaultBehavior: [],
        },
      },
    }),
    react(),
    command === "build"
      ? cloudflare({ viteEnvironment: { name: "ssr" } })
      : undefined,
  ].filter(Boolean),
}));
