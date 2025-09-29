import WatchlistTable from "@/components/WatchlistTable";
import { getWatchlistPage } from "@/lib/actions/watchlist.actions";

export default async function Watchlist() {
  const initial = await getWatchlistPage({ page: 1, pageSize: 10 });
  return (
    <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <section className="w-full home-section">
        <WatchlistTable initialData={initial} />
      </section>
    </div>
  );
}
