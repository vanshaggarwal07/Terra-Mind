import { NextResponse } from "next/server";

import { appendActivityRow, fetchListingsFromSheet } from "@/lib/sheets";
import type { ActivityPayload } from "@/lib/types";

export async function GET() {
  const { listings, source } = await fetchListingsFromSheet();
  return NextResponse.json({ listings, source, count: listings.length });
}

export async function POST(request: Request) {
  let body: ActivityPayload;
  try {
    body = (await request.json()) as ActivityPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const result = await appendActivityRow(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to append Activity row", mode: result.mode },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, mode: result.mode });
}
