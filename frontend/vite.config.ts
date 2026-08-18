import { execSync } from "node:child_process";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Identifies the deployed build. The commit is the only identifier that cannot
 * drift from what is actually running, which is why package.json's `version` is
 * not used here and is not bumped per commit.
 *
 * In CI, GITHUB_SHA is authoritative — the checkout may be detached or shallow,
 * and Actions knows the ref better than git does locally.
 */
function resolveCommit(): string {
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    // No git (a tarball build, a fresh container). Not worth failing over.
    return "unknown";
  }
}

/**
 * Serves the repo-level `data/` folder at `/data` during development, so the
 * app uses the exact same URLs it will use in production (where
 * scripts/postbuild.mjs copies `data/` into `dist/data`). Without this the SPA
 * fallback answers `/data/manifest.json` with index.html — a 200 that is not
 * data, which is the worst kind of 404.
 */
function serveRepoData(): Plugin {
  const dataDir = fileURLToPath(new URL("../data", import.meta.url));
  const types: Record<string, string> = {
    ".json": "application/json",
    ".tsv": "text/tab-separated-values; charset=utf-8",
    ".ogg": "audio/ogg",
  };

  return {
    name: "serve-repo-data",
    apply: "serve",
    configureServer(server) {
      // connect strips the "/data" mount prefix from req.url before calling us.
      server.middlewares.use("/data", (req, res, next) => {
        let urlPath: string;
        try {
          urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
        } catch {
          // Malformed percent-encoding; not ours to 500 over.
          return next();
        }
        const file = path.resolve(dataDir, `.${urlPath}`);
        // resolve() collapses any "..", so anything escaping data/ falls out.
        if (!file.startsWith(dataDir + path.sep)) return next();
        if (!statSync(file, { throwIfNoEntry: false })?.isFile()) return next();
        res.setHeader(
          "Content-Type",
          types[path.extname(file)] ?? "application/octet-stream",
        );
        // The stat above is only advisory: the file can vanish before the
        // stream opens, and an unhandled stream 'error' kills the dev server.
        createReadStream(file)
          .on("error", () => {
            if (!res.headersSent) res.statusCode = 404;
            res.end();
          })
          .pipe(res);
      });
    },
  };
}

/**
 * Custom domain (flashcards.nomomon.xyz) serves the app from the domain root,
 * so `base` stays "/". The deck/audio data lives in the repo's `data/` folder
 * and is copied to `dist/data` by scripts/postbuild.mjs, which is why the
 * default VITE_DATA_BASE_URL is same-origin.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), serveRepoData()],
  base: "/",
  define: {
    __APP_COMMIT__: JSON.stringify(resolveCommit()),
    __BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    // Fail loudly instead of wandering to 3001: a bookmarked port that silently
    // moves is worse than a clear "port in use".
    strictPort: true,
    // Let Vite's own /@fs/ module serving reach repo-level files. Note this
    // does NOT serve data/ at /data — that is serveRepoData's job above.
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
