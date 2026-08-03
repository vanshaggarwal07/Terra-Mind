-- Corridor Signal Feed schema (Vercel Postgres / Neon / local PGlite)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS news_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS news_items_category_idx
  ON news_items (category);

CREATE INDEX IF NOT EXISTS news_items_source_type_idx
  ON news_items (source_type);

CREATE INDEX IF NOT EXISTS news_items_fetched_at_idx
  ON news_items (fetched_at DESC);

CREATE TABLE IF NOT EXISTS news_sync_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  ok            boolean NOT NULL DEFAULT false,
  per_source    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS news_sync_runs_finished_at_idx
  ON news_sync_runs (finished_at DESC NULLS LAST);
