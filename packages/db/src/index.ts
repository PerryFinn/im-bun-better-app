import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { dirname, resolve } from "pathe";

let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

const getDbPath = (): string => resolve(process.env.DB_FILE_NAME ?? "local.db");

const ensureParentDirectory = async (filePath: string) =>
  mkdir(dirname(filePath), { recursive: true });

export const initDb = (): Promise<ReturnType<typeof drizzle>> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const dbPath = getDbPath();
    await ensureParentDirectory(dbPath);

    const sqliteClient = new Database(dbPath, { create: true });
    const drizzleDb = drizzle(sqliteClient);

    const migrationsFolder = resolve("./drizzle");
    await mkdir(migrationsFolder, { recursive: true });
    await migrate(drizzleDb, { migrationsFolder });

    return drizzleDb;
  })();

  return initPromise;
};

export const db = await initDb();
