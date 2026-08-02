import { Database as SQLiteDatabase } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { dirname, join, resolve } from "pathe";
import { DEFAULT_DB_FILE_NAME, DEFAULT_DB_MIGRATIONS_DIR } from "./constants";

export type Database = ReturnType<typeof drizzle>;

type CreateDatabaseOptions = {
  filename?: string;
  migrationsFolder?: string;
  runMigrations?: boolean;
};

export type DatabaseConnection = {
  close: () => void;
  db: Database;
};

const getDbPath = (filename?: string) =>
  resolve(filename ?? join(dirname(process.execPath), DEFAULT_DB_FILE_NAME));

function resolveMigrationsFolder(explicitFolder?: string) {
  const byExec = join(dirname(process.execPath), DEFAULT_DB_MIGRATIONS_DIR);
  const byBundle = join(import.meta.dir, DEFAULT_DB_MIGRATIONS_DIR);
  const bySource = resolve(import.meta.dir, "..", DEFAULT_DB_MIGRATIONS_DIR);

  const candidates = explicitFolder
    ? [resolve(explicitFolder)]
    : [byExec, byBundle, bySource];

  const found = candidates.find((p) =>
    existsSync(join(p, "meta", "_journal.json"))
  );
  return { candidates, found };
}

export const createDatabase = async ({
  filename,
  migrationsFolder,
  runMigrations = true,
}: CreateDatabaseOptions = {}): Promise<DatabaseConnection> => {
  const dbPath = getDbPath(filename);
  await mkdir(dirname(dbPath), { recursive: true });

  const sqliteClient = new SQLiteDatabase(dbPath, { create: true });
  const db = drizzle(sqliteClient);

  try {
    if (runMigrations) {
      const { found, candidates } = resolveMigrationsFolder(migrationsFolder);

      if (!found) {
        throw new Error(
          `找不到数据库迁移目录：${DEFAULT_DB_MIGRATIONS_DIR}\n` +
            `尝试过的路径：\n${candidates.map((p) => `- ${p}`).join("\n")}`
        );
      }

      migrate(db, { migrationsFolder: found });
    }

    return {
      close: () => sqliteClient.close(),
      db,
    };
  } catch (error) {
    sqliteClient.close();
    throw error;
  }
};
