import { NextResponse } from "next/server";

import { fetchListingsFromSheet } from "@/lib/sheets";

export async function GET() {
  const { listings, source } = await fetchListingsFromSheet();
  return NextResponse.json({ listings, source });
}
