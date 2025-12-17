import { drizzle } from "drizzle-orm/bun-sqlite";

// You can specify any property from the bun:sql connection options
export const db = drizzle({
  connection: { source: process.env.DATABASE_URL || "" },
});
