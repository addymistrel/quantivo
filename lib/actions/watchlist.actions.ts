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

// Helper function to parse market cap string back to number for sorting
function parseMarketCapToNumber(marketCapStr?: string): number {
  if (!marketCapStr) return 0;

  const numStr = marketCapStr.replace(/[$,B,M]/g, "");
  const num = parseFloat(numStr);

  if (marketCapStr.includes("B")) {
    return num * 1000; // Convert billions to millions for comparison
  } else if (marketCapStr.includes("M")) {
    return num;
  }

  return num;
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
    // Fetch both profile and basic financials
    const profile = await getCompanyDataFromSymol(symbol, 3600); // cached 1h
    const marketCapRaw = profile?.marketCapitalization;

    // Fetch basic financials for P/E ratio
    let peRatio: number | undefined = undefined;
    try {
      const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(
        symbol
      )}&metric=all&token=${token}`;
      const metricsData = await fetchJSON<any>(metricsUrl, 3600);
      // Try different P/E ratio fields from Finnhub
      peRatio =
        metricsData?.metric?.peBasicExclExtraTTM ||
        metricsData?.metric?.peNormalizedAnnual ||
        metricsData?.metric?.peTTM ||
        undefined;
    } catch (metricsError) {
      console.error("Failed to fetch metrics for", symbol, metricsError);
    }

    // Format market cap properly
    let marketCap: string | undefined = undefined;
    if (marketCapRaw && typeof marketCapRaw === "number") {
      if (marketCapRaw >= 1000000) {
        marketCap = `$${(marketCapRaw / 1000).toFixed(2)}B`;
      } else if (marketCapRaw >= 1000) {
        marketCap = `$${marketCapRaw.toFixed(2)}M`;
      } else {
        marketCap = `$${marketCapRaw.toFixed(2)}M`;
      }
    }

    return { marketCap, peRatio };
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

    // sort parsing - handle different field types
    const [sortField, sortDir] = sort.split(":");
    let sortObj: any = {};

    // Map frontend sort fields to database fields where necessary
    switch (sortField) {
      case "currentPrice":
      case "changePercent":
      case "marketCap":
      case "peRatio":
        // These fields will be sorted after data enrichment since they come from API
        sortObj = { addedAt: -1 }; // Default sort for now
        break;
      default:
        sortObj = { [sortField]: sortDir === "asc" ? 1 : -1 };
    }

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
      const m = metrics[idx] as { marketCap?: string; peRatio?: number };
      console.log(m);
      return {
        userId: d.userId,
        symbol: d.symbol,
        company: d.company,
        addedAt: d.addedAt,
        currentPrice: q.price,
        changePercent: q.changePercent,
        marketCap: m.marketCap || undefined,
        peRatio: m.peRatio ? m.peRatio.toFixed(2) : undefined,
        isFavorite: (d as any).isFavorite || false,
      } as StockWithData;
    });

    // Filter gainers/losers after enrichment (server side)
    let filtered = items;
    if (filter === "gainers")
      filtered = items.filter((i) => (i.changePercent || 0) > 0);
    if (filter === "losers")
      filtered = items.filter((i) => (i.changePercent || 0) < 0);

    // Apply sorting for API-derived fields
    if (
      ["currentPrice", "changePercent", "marketCap", "peRatio"].includes(
        sortField
      )
    ) {
      filtered.sort((a, b) => {
        let aVal: number, bVal: number;

        switch (sortField) {
          case "currentPrice":
            aVal = a.currentPrice || 0;
            bVal = b.currentPrice || 0;
            break;
          case "changePercent":
            aVal = a.changePercent || 0;
            bVal = b.changePercent || 0;
            break;
          case "marketCap":
            // Parse market cap string back to number for sorting
            aVal = parseMarketCapToNumber(a.marketCap);
            bVal = parseMarketCapToNumber(b.marketCap);
            break;
          case "peRatio":
            aVal = parseFloat(a.peRatio || "0") || 0;
            bVal = parseFloat(b.peRatio || "0") || 0;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }

        const result = aVal - bVal;
        return sortDir === "asc" ? result : -result;
      });
    }

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
