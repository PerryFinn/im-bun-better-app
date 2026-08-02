import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { dirname, join, resolve } from "pathe";
import { DEFAULT_DB_FILE_NAME, DEFAULT_DB_MIGRATIONS_DIR } from "./constants";

let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

// 由 apps/server 应用执行，所以 process.env 取的是 server 应用的 .env 文件
const getDbPath = () =>
  resolve(
    process.env.DB_FILE_NAME ??
      join(dirname(process.execPath), DEFAULT_DB_FILE_NAME)
  );

function resolveMigrationsFolder() {
  // ✅ 路线 A：zip 发布（可执行文件同级 db-migrations/）
  const byExec = join(dirname(process.execPath), DEFAULT_DB_MIGRATIONS_DIR);
  // ✅ Bun bundle：dist/index.js -> dist/db-migrations
  const byBundle = join(import.meta.dir, DEFAULT_DB_MIGRATIONS_DIR);
  // ✅ 开发态：db/src -> db/db-migrations
  const bySource = resolve(import.meta.dir, "..", DEFAULT_DB_MIGRATIONS_DIR);

  const candidates = [byExec, byBundle, bySource];

  console.debug("process.execPath :>> ", process.execPath);
  console.log("process.env.DB_FILE_NAME :>> ", process.env.DB_FILE_NAME);
  console.log("candidates :>> ", candidates);

  const found = candidates.find((p) =>
    existsSync(join(p, "meta", "_journal.json"))
  );
  return { candidates, found };
}

export const initDb = () => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const dbPath = getDbPath();
    console.log("dbPath :>> ", dbPath);
    await mkdir(dirname(dbPath), { recursive: true });

    const sqliteClient = new Database(dbPath, { create: true });
    const db = drizzle(sqliteClient);

    const { found, candidates } = resolveMigrationsFolder();
    const skip = process.env.SKIP_DB_MIGRATIONS === "1";

    if (!found) {
      if (skip) {
        return db;
      }
      throw new Error(
        `找不到数据库迁移目录：${DEFAULT_DB_MIGRATIONS_DIR}\n` +
          `尝试过的路径：\n${candidates.map((p) => `- ${p}`).join("\n")}`
      );
    }

    migrate(db, { migrationsFolder: found });
    return db;
  })();

  return initPromise;
};

export const db = await initDb();
