import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "./src/manifest";

// Genera dist/manifest.json desde el manifest tipado / generate manifest.json from typed source.
function manifestPlugin(): Plugin {
  return {
    name: "manifest-generator",
    closeBundle() {
      writeFileSync(resolve(__dirname, "dist/manifest.json"), JSON.stringify(manifest, null, 2));
      // eslint-disable-next-line no-console
      console.log("✅ dist/manifest.json generado");
    },
  };
}

export default defineConfig({
  plugins: [react(), manifestPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        connect: resolve(__dirname, "connect.html"),
        notification: resolve(__dirname, "notification.html"),
        background: resolve(__dirname, "src/background.ts"),
        "content-script": resolve(__dirname, "src/content-script.ts"),
        inject: resolve(__dirname, "src/inject.ts"),
      },
      output: {
        // Los scripts de extensión van a la raíz de dist/; el resto a assets/.
        entryFileNames: (chunk) =>
          ["background", "content-script", "inject"].includes(chunk.name)
            ? "[name].js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Bundle local de ethers (sin CDN) → cumple CSP de MV3.
    target: "es2022",
    minify: "esbuild",
  },
});
