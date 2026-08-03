import { NextResponse } from "next/server";

import { runNewsSyncSafe } from "@/lib/news/aggregator";

export const dynamic = "force-dynamic";
// Sync can run several minutes (Google News tiles + NewsAPI + gov).
// Hobby cron still caps wall time; Pro/self-host can use the full window.
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/sync-news] CRON_SECRET is not configured");
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Manual trigger fallback: ?secret=CRON_SECRET
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runNewsSyncSafe();
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
