import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, join, resolve } from "pathe";
import { DEFAULT_DB_FILE_NAME } from "./src/constants";

dotenv.config({
  path: "../../apps/server/.env",
});

const currentFileDir = dirname(fileURLToPath(import.meta.url));

const projectRoot = resolve(currentFileDir, "..", "..");

const devDBPath = join(projectRoot, "apps", "server", DEFAULT_DB_FILE_NAME);

export default defineConfig({
  dbCredentials: {
    url: process.env.DB_FILE_NAME || devDBPath,
  },
  dialect: "sqlite",
  out: "./db-migrations",
  schema: "./src/schema",
});
