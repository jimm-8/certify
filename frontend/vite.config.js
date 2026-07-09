import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const LONG_TERM_ASSET_CACHE =
  "public, max-age=31536000, immutable";

function assetCacheHeadersPlugin() {
  const applyCacheHeaders = (req, res, next) => {
    const requestPath = req.url?.split("?")[0] || "";
    const isAssetRequest = requestPath.startsWith("/assets/");
    const hasHashedName = /-[A-Za-z0-9_-]{6,}\./.test(requestPath);

    if (isAssetRequest && hasHashedName) {
      res.setHeader("Cache-Control", LONG_TERM_ASSET_CACHE);
    }

    next();
  };

  return {
    name: "asset-cache-headers",
    configureServer(server) {
      server.middlewares.use(applyCacheHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(applyCacheHeaders);
    },
  };
}

export default defineConfig({
  plugins: [react(), assetCacheHeadersPlugin()],

  build: {
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          vendor: ["axios"],
        },
      },
    },
  },
});
