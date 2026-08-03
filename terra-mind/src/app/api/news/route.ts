import { NextResponse } from "next/server";

import { ensureNewsSchema } from "@/lib/db";
import { listNewsItems } from "@/lib/news/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureNewsSchema();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "500");

    const result = await listNewsItems({
      category: category || undefined,
      q: q || undefined,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 500,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load news";
    console.error("[api/news]", message);
    return NextResponse.json(
      { items: [], page: 1, limit: 500, total: 0, error: message },
      { status: 200 },
    );
  }
}
