import { cp, rm } from "node:fs/promises";
import Bun from "bun";
import { resolve } from "pathe";

const serverDir = resolve(import.meta.dir, "..");
const outdir = resolve(serverDir, "dist");
const migrationsDir = resolve(serverDir, "../../packages/db/db-migrations");

await rm(outdir, { force: true, recursive: true });

const result = await Bun.build({
  entrypoints: [resolve(serverDir, "src/index.ts")],
  outdir,
  target: "bun",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await cp(migrationsDir, resolve(outdir, "db-migrations"), {
  recursive: true,
});
