import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import { getPool } from "./pool.mjs";
import * as schema from "./schema";

let db: ReturnType<typeof createDatabase> | undefined;
function createDatabase() {
  return drizzle(getPool(), { schema, mode: "default" });
}
export function getDb() { return db ??= createDatabase(); }
