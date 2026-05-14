import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/ronins-gambit/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  build: {
    ssr: false,
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    react(),
    {
      name: 'copy-404',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '404.html',
          source: `<!DOCTYPE html>
<html>
<head>
  <title>Ronin's Gambit</title>
  <script>
    sessionStorage.redirect = location.href;
  </script>
  <meta http-equiv="refresh" content="0;URL=/ronins-gambit/"></meta>
</head>
<body>
</body>
</html>`
        });
      }
    }
  ],
});