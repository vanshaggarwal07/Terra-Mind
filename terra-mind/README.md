# Terra-Mind

Property intelligence UI for the Noida / Yamuna Expressway / Jewar Airport corridor.

## Run

```bash
cd terra-mind
npm install
cp .env.example .env.local   # add Google service account when ready
npm run dev                  # http://localhost:3000 (or next free port)
```

```bash
npm test
npm run build
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Cinematic landing |
| `/explore` | Filtered listings grid + 3D corridor map (react-three-fiber) |
| `/news` | Corridor Signal Feed (aggregated gov + news) |
| `/calculator` | Investment model |
| `/property/[id]` | Full parcel dossier |
| `/enquire` | Enquiry form → `POST /api/sheets-sync` |

## Corridor Signal Feed

Server-side aggregation into Postgres. The browser only calls `/api/news` and `/api/news/sync-status`.

### Env

See `.env.example`:

- `POSTGRES_URL` — **required on Vercel** (Vercel Postgres / Neon)
- `NEWSAPI_KEY` — NewsAPI.org (Developer plan is localhost-only)
- `CRON_SECRET` — protects `/api/cron/sync-news` (Vercel Cron sends `Authorization: Bearer …`)
- `NEWS_SYNC_INTERVAL_MINUTES` — auto-sync cadence (default `360` = 4×/day). Used by the in-process scheduler and stale page refresh.
- `NEWS_SYNC_SCHEDULER` — set `false` to disable the in-process interval scheduler
- `X_MONITORING_ENABLED` / `X_BEARER_TOKEN` — optional paid X API module

Locally, if `POSTGRES_URL` is unset, a PGlite DB is used under `.data/news-pglite`.

### Commands

```bash
npm run news:smoke   # insert + read one row
npm run news:sync    # run full aggregator once
```

Corporate SSL proxies (e.g. managed laptops that re-sign HTTPS traffic) are handled automatically: `src/lib/devTls.ts` relaxes certificate verification for local dev only, so `npm run dev` / `npm run news:sync` work out of the box. It is a strict no-op when `NODE_ENV=production` or `VERCEL` is set, so production always keeps full certificate verification.

### Automatic sync (4×/day)

1. **Local / `next start`:** `instrumentation.ts` starts a scheduler that syncs every `NEWS_SYNC_INTERVAL_MINUTES` (default 360 → 4×/day). Keep `npm run dev` (or `npm start`) running.
2. **Visiting `/news`:** if the archive is stale, a background sync starts after the response.
3. **Vercel:** `vercel.json` cron is `0 */6 * * *` (every 6 hours). **Pro plan required** for more than once/day; on Hobby use an external cron hitting `/api/cron/sync-news` with `Authorization: Bearer $CRON_SECRET`.

**Honest constraints:** NewsAPI free keys often block production hosts; official YEIDA/GNIDA sites are Cloudflare-protected — those modules fall back to Google News RSS scoped to authority keywords and log clearly.

## Google Sheets

Without credentials the app uses survey fallback listings and logs Activity rows to the server console (`mode: "local"`).

With credentials (see `.env.example`):

- **Listings** tab → `GET /api/listings` / explore page
- **Activity** tab → every enquire / calculator use / filter change
