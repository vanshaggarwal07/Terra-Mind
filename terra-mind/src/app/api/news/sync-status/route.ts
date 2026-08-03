import { NextResponse } from "next/server";

import { ensureNewsSchema } from "@/lib/db";
import { getSyncStatus } from "@/lib/news/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureNewsSchema();
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "status unavailable";
    console.error("[api/news/sync-status]", message);
    return NextResponse.json(
      {
        lastSyncedAt: null,
        lastSyncOk: null,
        counts: { government: 0, news: 0, x: 0, total: 0 },
        perSource: [],
        error: message,
      },
      { status: 200 },
    );
  }
}
