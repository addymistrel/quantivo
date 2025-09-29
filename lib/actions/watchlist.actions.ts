"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import {
  fetchJSON,
  getCompanyDataFromSymol,
} from "@/lib/actions/finnhub.actions";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // Better Auth stores users in the "user" collection
    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

export async function addToWatchlist(symbol: string, company: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const watchlistItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company,
      addedAt: new Date(),
      isFavorite: false,
    });

    console.log(watchlistItem);

    await watchlistItem.save();
    return { success: true };
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - item already exists
      return { success: true, message: "Item already in watchlist" };
    }
    console.error("addToWatchlist error:", error);
    return { success: false, error: error.message };
  }
}

export async function removeFromWatchlist(symbol: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("removeFromWatchlist error:", error);
    return { success: false, error: error.message };
  }
}

export async function isSymbolInWatchlist(symbol: string): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return false;
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const item = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    return !!item;
  } catch (error) {
    console.error("isSymbolInWatchlist error:", error);
    return false;
  }
}

// Pagination & enriched data fetch
export interface GetWatchlistPageParams {
  page?: number; // 1-based
  pageSize?: number;
  search?: string; // search by symbol/company
  filter?: "all" | "gainers" | "losers" | "favorites";
  sort?: string; // e.g. "symbol:asc" or "addedAt:desc"
}

export interface WatchlistPageResult {
  items: StockWithData[];
  total: number;
  page: number;
  pageSize: number;
}

// Helper to fetch quote + metrics for multiple symbols in parallel (basic)
async function fetchQuoteForSymbol(symbol: string) {
  const token =
    process.env.FINNHUB_API_KEY ||
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
    "";
  if (!token) return { price: undefined, changePercent: undefined };
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;
    const data = await fetchJSON<any>(url, 30); // revalidate 30s
    return {
      price: data.c as number | undefined,
      changePercent: data.dp as number | undefined,
    };
  } catch (e) {
    console.error("fetchQuoteForSymbol error", symbol, e);
    return { price: undefined, changePercent: undefined };
  }
}

async function fetchMetricsForSymbol(symbol: string) {
  const token =
    process.env.FINNHUB_API_KEY ||
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY ||
    "";
  if (!token) return { marketCap: undefined, peRatio: undefined };
  try {
    const profile = await getCompanyDataFromSymol(symbol, 3600); // cached 1h
    const marketCap = profile?.marketCapitalization;
    // Finnhub returns peBasicExclExtraTTM or similar metrics via /stock/metric endpoint; skip for now for rate limiting
    return { marketCap, peRatio: undefined };
  } catch (e) {
    console.error("fetchMetricsForSymbol error", symbol, e);
    return { marketCap: undefined, peRatio: undefined };
  }
}

export async function getWatchlistPage(
  params: GetWatchlistPageParams = {}
): Promise<WatchlistPageResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { items: [], total: 0, page: 1, pageSize: params.pageSize || 10 };
    }
    const {
      page = 1,
      pageSize = 10,
      search = "",
      filter = "all",
      sort = "addedAt:desc",
    } = params;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const query: any = { userId: session.user.id };
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }
    if (filter === "favorites") {
      query.isFavorite = true;
    }

    const total = await Watchlist.countDocuments(query);

    // sort parsing
    const [sortField, sortDir] = sort.split(":");
    const sortObj: any = { [sortField]: sortDir === "asc" ? 1 : -1 };

    const docs = await Watchlist.find(query)
      .sort(sortObj)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Fetch quotes concurrently
    const symbolPromises = docs.map((d) => fetchQuoteForSymbol(d.symbol));
    const metricPromises = docs.map((d) => fetchMetricsForSymbol(d.symbol));
    const quotes = await Promise.all(symbolPromises);
    const metrics = await Promise.all(metricPromises);

    const items: StockWithData[] = docs.map((d, idx) => {
      const q = quotes[idx];
      const m = metrics[idx] as { marketCap?: number; peRatio?: number };
      return {
        userId: d.userId,
        symbol: d.symbol,
        company: d.company,
        addedAt: d.addedAt,
        currentPrice: q.price,
        changePercent: q.changePercent,
        marketCap: m.marketCap ? `$${m.marketCap.toFixed(2)}B` : undefined,
        peRatio: m.peRatio ? m.peRatio.toString() : undefined,
        isFavorite: (d as any).isFavorite || false,
      } as StockWithData;
    });

    // Filter gainers/losers after enrichment (server side)
    let filtered = items;
    if (filter === "gainers")
      filtered = items.filter((i) => (i.changePercent || 0) > 0);
    if (filter === "losers")
      filtered = items.filter((i) => (i.changePercent || 0) < 0);

    return { items: filtered, total, page, pageSize };
  } catch (e) {
    console.error("getWatchlistPage error", e);
    return { items: [], total: 0, page: 1, pageSize: params.pageSize || 10 };
  }
}

export async function toggleFavorite(symbol: string, value: boolean) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) throw new Error("User not authenticated");
    await Watchlist.updateOne(
      { userId: session.user.id, symbol: symbol.toUpperCase() },
      { $set: { isFavorite: value } }
    );
    return { success: true };
  } catch (e: any) {
    console.error("toggleFavorite error", e);
    return { success: false, error: e.message };
  }
}
