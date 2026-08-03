import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type SqlRow = Record<string, unknown>;

export type SqlClient = {
  <T extends SqlRow = SqlRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
};

type PGliteLike = {
  waitReady: Promise<unknown>;
  exec: (sql: string) => Promise<unknown>;
  query: <T>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>;
};

type GlobalDb = {
  __terraMindNeonSql?: NeonQueryFunction<false, false> | null;
  __terraMindPglite?: PGliteLike | null;
  __terraMindDbReady?: Promise<void> | null;
  __terraMindSchemaReady?: boolean;
};

const g = globalThis as unknown as GlobalDb;

function postgresUrl(): string | undefined {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

export function dbBackend(): "neon" | "pglite" {
  return postgresUrl() ? "neon" : "pglite";
}

function interpolate(
  strings: TemplateStringsArray,
  values: unknown[],
): { text: string; params: unknown[] } {
  let text = "";
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return { text, params };
}

const PGLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS news_items (
  id            text PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text)),
  headline      text NOT NULL,
  body          text,
  source_name   text NOT NULL,
  source_url    text NOT NULL UNIQUE,
  published_at  timestamptz,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  category      text,
  source_type   text NOT NULL CHECK (source_type IN ('government', 'news', 'x'))
);
CREATE INDEX IF NOT EXISTS news_items_published_at_idx
  ON news_items (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS news_items_category_idx ON news_items (category);
CREATE INDEX IF NOT EXISTS news_items_source_type_idx ON news_items (source_type);
CREATE INDEX IF NOT EXISTS news_items_fetched_at_idx ON news_items (fetched_at DESC);
CREATE TABLE IF NOT EXISTS news_sync_runs (
  id            text PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text)),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  ok            boolean NOT NULL DEFAULT false,
  per_source    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS news_sync_runs_finished_at_idx
  ON news_sync_runs (finished_at DESC NULLS LAST);
`;

function clearStalePgliteLock(dataDir: string) {
  const pidPath = path.join(dataDir, "postmaster.pid");
  if (!existsSync(pidPath)) return;
  try {
    unlinkSync(pidPath);
    console.warn("[db] cleared stale PGlite postmaster.pid");
  } catch (err) {
    console.warn(
      "[db] could not clear postmaster.pid:",
      err instanceof Error ? err.message : err,
    );
  }
}

async function getPglite(): Promise<PGliteLike> {
  if (g.__terraMindPglite) return g.__terraMindPglite;
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.PGLITE_DATA_DIR ||
    path.join(process.cwd(), ".data", "news-pglite");
  mkdirSync(dataDir, { recursive: true });
  clearStalePgliteLock(dataDir);
  try {
    const instance = new PGlite(dataDir) as unknown as PGliteLike;
    await instance.waitReady;
    g.__terraMindPglite = instance;
    return instance;
  } catch (err) {
    g.__terraMindPglite = null;
    g.__terraMindDbReady = null;
    g.__terraMindSchemaReady = false;
    throw err;
  }
}

async function applyNeonSchema(client: NeonQueryFunction<false, false>) {
  const schemaPath = path.join(process.cwd(), "sql", "news_schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const parts = schema.split(";").map((p) =>
    p
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  );
  for (const stmt of parts) {
    if (!stmt) continue;
    try {
      await (
        client as unknown as (
          query: string,
          params?: unknown[],
        ) => Promise<unknown>
      )(stmt, []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("duplicate")
      ) {
        continue;
      }
      console.warn("[db] neon schema statement warning:", msg);
    }
  }
}

async function ensureReady(): Promise<void> {
  if (g.__terraMindSchemaReady) return;
  if (!g.__terraMindDbReady) {
    g.__terraMindDbReady = (async () => {
      const url = postgresUrl();
      if (url) {
        g.__terraMindNeonSql = neon(url);
        await applyNeonSchema(g.__terraMindNeonSql);
      } else {
        if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
          throw new Error(
            "POSTGRES_URL is required on Vercel. Provision Vercel Postgres and set POSTGRES_URL.",
          );
        }
        const db = await getPglite();
        await db.exec(PGLITE_SCHEMA);
        console.info(
          "[db] Using local PGlite at .data/news-pglite (set POSTGRES_URL for Vercel Postgres).",
        );
      }
      g.__terraMindSchemaReady = true;
    })();
  }
  await g.__terraMindDbReady;
}

export const sql: SqlClient = async <T extends SqlRow = SqlRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> => {
  await ensureReady();
  const url = postgresUrl();
  if (url) {
    if (!g.__terraMindNeonSql) g.__terraMindNeonSql = neon(url);
    return (await g.__terraMindNeonSql(strings, ...values)) as T[];
  }
  const db = await getPglite();
  const { text, params } = interpolate(strings, values);
  const result = await db.query<T>(text, params);
  return result.rows;
};

export async function ensureNewsSchema(): Promise<void> {
  await ensureReady();
}
