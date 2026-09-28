import { defineConfig } from "drizzle-kit";

const url = process.env.ANALYTICS_DATABASE_URL;
if (!url) {
  throw new Error(
    "ANALYTICS_DATABASE_URL is not set. Use `pnpm db:migrate` or `pnpm db:migrate:test`.",
  );
}

export default defineConfig({
  schema: "./lib/database/postgres/schema/index.ts",
  out: "./lib/database/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
