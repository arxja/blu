import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { serverConfig } from "@/lib/config";
import * as schema from "./schema";

export function createDb(url: string) {
  const client = neon(url);
  const db = drizzle(client, { schema });
  return db;
}

export const db = createDb(serverConfig.ANALYTICS_DATABASE_POOL_URL);

export type Db = ReturnType<typeof createDb>;
