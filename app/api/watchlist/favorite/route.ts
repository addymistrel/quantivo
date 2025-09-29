import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite } from "@/lib/actions/watchlist.actions";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, value } = body as { symbol?: string; value?: boolean };
    if (!symbol || typeof value !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 }
      );
    }
    const result = await toggleFavorite(symbol, value);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
