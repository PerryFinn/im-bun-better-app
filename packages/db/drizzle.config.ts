import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, join } from "pathe";
import { DEFAULT_DB_FILE_NAME } from "./src/constants";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: "./src/schema",
  out: "./db-migrations",
  dialect: "sqlite",
  dbCredentials: {
    url:
      process.env.DB_FILE_NAME ||
      join(dirname(process.execPath), DEFAULT_DB_FILE_NAME),
  },
});
