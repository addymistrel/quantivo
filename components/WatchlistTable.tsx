"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BellPlus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type FilterType = "all" | "gainers" | "losers" | "favorites";

interface WatchlistTableClientProps {
  initialData: WatchlistPageResult;
}

export default function WatchlistTable({
  initialData,
}: WatchlistTableClientProps) {
  const [items, setItems] = useState<StockWithData[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("addedAt:desc");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const fetchData = useCallback(
    async (
      override?: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filter: FilterType;
      }>
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(override?.page ?? page));
        params.set("pageSize", String(override?.pageSize ?? pageSize));
        if ((override?.search ?? search).trim())
          params.set("search", (override?.search ?? search).trim());
        if (override?.filter ?? filter)
          params.set("filter", override?.filter ?? filter);
        params.set("sort", sort);
        const res = await fetch(`/api/watchlist?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch watchlist");
        const json: WatchlistPageResult = await res.json();
        setItems(json.items);
        setPage(json.page);
        setPageSize(json.pageSize);
        setTotal(json.total);
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to load watchlist");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, filter, sort]
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(pendingSearch);
    }, 500);
    return () => clearTimeout(t);
  }, [pendingSearch]);

  // Refetch when search/filter/page/pageSize changes
  useEffect(() => {
    fetchData();
  }, [search, filter, page, pageSize, fetchData]);

  // Polling for quote updates every 20s
  const pollQuotes = useCallback(async () => {
    if (!items.length) return;
    try {
      const symbols = items.map((i) => i.symbol).join(",");
      const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
      if (!token) return; // skip if no key
      // For simplicity reuse /api/watchlist with same params to refresh
      await fetchData();
    } catch (e) {
      console.error("poll error", e);
    }
  }, [items, fetchData]);

  useEffect(() => {
    pollingRef.current = setInterval(pollQuotes, 20000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollQuotes]);

  const toggleFavorite = async (
    symbol: string,
    current: boolean | undefined
  ) => {
    try {
      setItems((prev) =>
        prev.map((i) =>
          i.symbol === symbol ? { ...i, isFavorite: !current } : i
        )
      );
      const res = await fetch("/api/watchlist/favorite", {
        method: "PATCH",
        body: JSON.stringify({ symbol, value: !current }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
    } catch (e: any) {
      toast.error(e.message || "Failed to update favorite");
      // revert
      setItems((prev) =>
        prev.map((i) =>
          i.symbol === symbol ? { ...i, isFavorite: current } : i
        )
      );
    }
  };

  const handleAddAlert = async (item: StockWithData) => {
    const thresholdStr = prompt(`Set price threshold for ${item.symbol}`);
    if (!thresholdStr) return;
    const threshold = parseFloat(thresholdStr);
    if (Number.isNaN(threshold)) {
      toast.error("Invalid threshold");
      return;
    }
    const alertType: "upper" | "lower" =
      threshold > (item.currentPrice || 0) ? "upper" : "lower";
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: item.symbol,
          company: item.company,
          alertType,
          threshold,
        }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Failed to create alert");
      toast.success("Alert created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create alert");
    }
  };

  const changePage = (dir: 1 | -1) => {
    setPage((p) => Math.min(totalPages, Math.max(1, p + dir)));
  };

  return (
    <div className="w-full text-white p-6 rounded-lg">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-semibold text-2xl text-gray-100">Watchlist</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Refreshing..." : `Total ${total}`}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            placeholder="Search by company or symbol..."
            value={pendingSearch}
            onChange={(e) => {
              setPendingSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:border-gray-700"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "gainers", "losers", "favorites"] as FilterType[]).map(
            (f) => (
              <Button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                variant={filter === f ? "default" : "outline"}
                className={
                  filter === f
                    ? f === "gainers"
                      ? "bg-green-600 hover:bg-green-700"
                      : f === "losers"
                      ? "bg-red-600 hover:bg-red-700"
                      : f === "favorites"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                    : "border-gray-700 hover:bg-gray-800"
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400 mb-2 flex-wrap gap-3">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400">Page Size</label>
          <select
            className="bg-gray-900 border border-gray-800 rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            {[10, 20, 30, 50].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={page === 1}
            onClick={() => changePage(-1)}
            className="border-gray-700 hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => changePage(1)}
            className="border-gray-700 hover:bg-gray-800"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-auto max-h-[700px] rounded-lg scrollbar-hide-default border border-gray-800">
        <Table className="watchlist-table">
          <TableHeader className="table-header sticky top-0 bg-gray-950/80 backdrop-blur z-10">
            <TableRow className="border-gray-800 hover:bg-transparent table-header-row">
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-gray-400">Company</TableHead>
              <TableHead className="text-gray-400">Symbol</TableHead>
              <TableHead className="text-gray-400">Price</TableHead>
              <TableHead className="text-gray-400">Change</TableHead>
              <TableHead className="text-gray-400">Market Cap</TableHead>
              <TableHead className="text-gray-400">P/E Ratio</TableHead>
              <TableHead className="text-gray-400">Alert</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-gray-500"
                >
                  No stocks found
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const change = item.changePercent ?? 0;
              return (
                <TableRow key={item.symbol} className="table-row">
                  <TableCell className="table-cell">
                    <button
                      onClick={() =>
                        toggleFavorite(item.symbol, item.isFavorite)
                      }
                      className="focus:outline-none"
                      title={item.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star
                        size={18}
                        className={
                          item.isFavorite
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-gray-600"
                        }
                      />
                    </button>
                  </TableCell>
                  <TableCell className="table-cell">{item.company}</TableCell>
                  <TableCell className="table-cell">{item.symbol}</TableCell>
                  <TableCell className="table-cell">
                    {item.currentPrice != null
                      ? `$${item.currentPrice.toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="table-cell">
                    <span
                      className={
                        change === 0
                          ? "text-gray-400"
                          : change > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {change > 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="table-cell">
                    {item.marketCap || "-"}
                  </TableCell>
                  <TableCell className="table-cell">
                    {item.peRatio || "-"}
                  </TableCell>
                  <TableCell className="table-cell">
                    <Button
                      onClick={() => handleAddAlert(item)}
                      variant="ghost"
                      className="bg-orange-900/30 hover:bg-orange-900/50 text-orange-500 h-8 px-4"
                    >
                      <BellPlus size={14} className="mr-1" /> Alert
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
