import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const base = "/VibeTube-Mobile/";
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: "offline-shell",
      closeBundle() {
        const dir = resolve("dist");
        const walk = (p: string): string[] =>
          readdirSync(p, { withFileTypes: true }).flatMap((e) =>
            e.isDirectory() ? walk(resolve(p, e.name)) : [resolve(p, e.name)],
          );
        const files = walk(dir).filter((p) => !p.endsWith("sw.js"));
        const assets = files.map(
          (p) => base + p.slice(dir.length + 1).replaceAll("\\", "/"),
        );
        const hash = createHash("sha256");
        for (const p of files) hash.update(readFileSync(p));
        hash.update(readFileSync("public/sw.js"));
        const version = hash.digest("hex").slice(0, 12);
        writeFileSync(
          resolve(dir, "sw.js"),
          readFileSync("public/sw.js", "utf8")
            .replace("/* PRECACHE */ []", JSON.stringify(assets))
            .replace("shell-v1", "shell-" + version),
        );
      },
    },
  ],
});
