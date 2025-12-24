import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { dirname, join, resolve } from "pathe";
import { DEFAULT_DB_FILE_NAME, DEFAULT_DB_MIGRATIONS_DIR } from "./constants";

let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

const getDbPath = () =>
  resolve(
    process.env.DB_FILE_NAME ??
      join(dirname(process.execPath), DEFAULT_DB_FILE_NAME)
  );

function resolveMigrationsFolder() {
  // ✅ 路线 A：zip 发布（可执行文件同级 db-migrations/）
  const byExec = join(dirname(process.execPath), DEFAULT_DB_MIGRATIONS_DIR);
  // ✅ 开发态：db/src -> db/db-migrations
  const bySource = resolve(import.meta.dir, "..", DEFAULT_DB_MIGRATIONS_DIR);

  const candidates = [byExec, bySource];
  const found = candidates.find((p) =>
    existsSync(join(p, "meta", "_journal.json"))
  );
  return { found, candidates };
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
    const db = drizzle(sqliteClient); // Bun 官方示例写法 :contentReference[oaicite:5]{index=5}

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
