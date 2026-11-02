import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** F070: the bundled fonts (packages/blocks/fonts) at /fonts/, for the canvas, previews and the desktop app. */
const fontsDir = fileURLToPath(new URL("../../packages/blocks/fonts", import.meta.url));
function bundledFonts(): Plugin {
  let outDir = "dist";
  return {
    name: "crust-bundled-fonts",
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use("/fonts", (req, res, next) => {
        const file = normalize(join(fontsDir, decodeURIComponent((req.url ?? "").split("?")[0])));
        if (!file.startsWith(fontsDir) || !file.endsWith(".woff2") || !existsSync(file)) return next();
        res.setHeader("Content-Type", "font/woff2");
        res.end(readFileSync(file));
      });
    },
    closeBundle() {
      cpSync(fontsDir, join(outDir, "fonts"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), bundledFonts()],
  build: { outDir: "dist", sourcemap: true, chunkSizeWarningLimit: 1000 },
});
