import { getNews } from "@/lib/actions/finnhub.actions";
import { formatTimeAgo } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Props {
  symbols?: string[];
}

// Server component: fetches latest (up to 6) news articles.
// If symbols provided, attempts company news round-robin, else general market news.
export default async function NewsList({ symbols }: Props) {
  let articles: MarketNewsArticle[] = [];
  try {
    articles = await getNews(symbols);
  } catch (e) {
    console.error("NewsList getNews error", e);
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-gray-500 text-sm border border-gray-600 rounded-lg p-6 bg-gray-800">
        No recent news found.
      </div>
    );
  }

  return (
    <div className="watchlist-news">
      {articles.map((a) => {
        const timeAgo = formatTimeAgo(a.datetime);
        return (
          <Link
            href={a.url}
            key={a.id + a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item group"
          >
            <span className="news-tag">
              {(a.related || "").split(",")[0] ||
                a.category?.toUpperCase() ||
                "NEWS"}
            </span>
            <h3 className="news-title group-hover:text-yellow-500 transition-colors">
              {a.headline}
            </h3>
            <div className="news-meta">
              <span>{a.source}</span>
              <span className="mx-1">•</span>
              <span>{timeAgo}</span>
            </div>
            <p className="news-summary">{a.summary}</p>
            <span className="news-cta">Read More →</span>
          </Link>
        );
      })}
    </div>
  );
}
