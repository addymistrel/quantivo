import { NextRequest, NextResponse } from "next/server";
import { getWatchlistPage } from "@/lib/actions/watchlist.actions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const search = searchParams.get("search") || "";
  const filter = (searchParams.get("filter") as any) || "all";
  const sort = searchParams.get("sort") || "addedAt:desc";
  const data = await getWatchlistPage({ page, pageSize, search, filter, sort });
  return NextResponse.json(data);
}
