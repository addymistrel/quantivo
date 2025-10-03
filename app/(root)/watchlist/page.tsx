"use client";

import WatchlistTable from "@/components/WatchlistTable";
import { getWatchlistPage } from "@/lib/actions/watchlist.actions";
import AlertList from "@/components/AlertList";
import { listAlertsWithQuotes } from "@/lib/actions/alert.actions";
import NewsList from "@/components/NewsList";

export default async function Watchlist() {
  const initial = await getWatchlistPage({ page: 1, pageSize: 10 });
  const alertRes = await listAlertsWithQuotes({ page: 1, pageSize: 50 });
  const alertItems =
    alertRes.success && alertRes.data
      ? alertRes.data.items.map((a: any) => ({
          id: String(a.id || a._id || a.id),
          userId: String(a.userId),
          symbol: a.symbol,
          company: a.company,
          alertType: a.alertType,
          threshold: a.threshold,
          alertName: a.alertName || null,
          frequency: a.frequency,
          createdAt:
            typeof a.createdAt === "string"
              ? a.createdAt
              : new Date(a.createdAt).toISOString(),
          isActive: a.isActive,
          currentPrice: a.currentPrice ?? null,
          changePercent: a.changePercent ?? null,
          logo: a.logo ?? null,
        }))
      : [];
  return (
    <div className="flex flex-col gap-8 min-h-screen p-4 md:p-6 lg:p-8">
      <section className="flex flex-col xl:flex-row w-full home-section">
        <div className="xl:flex-2">
          <WatchlistTable initialData={initial} />
        </div>
        <div className="xl:flex-1">
          <div className="flex items-center justify-between">
            <h1 className="alert-title mb-6">Alerts</h1>
          </div>
          <AlertList initial={alertItems as any} />
        </div>
      </section>
      <section className="flex flex-col w-full">
        <div className="flex items-center justify-between">
          <h1 className="alert-title mb-6">News</h1>
        </div>
        <NewsList symbols={initial.items.map((i: any) => i.symbol)} />
      </section>
    </div>
  );
}
