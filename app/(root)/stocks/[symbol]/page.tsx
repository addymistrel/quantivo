import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchListButton";
import { getCompanyDataFromSymol } from "@/lib/actions/finnhub.actions";
import { isSymbolInWatchlist } from "@/lib/actions/watchlist.actions";
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  BASELINE_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const isInWatchlist = await isSymbolInWatchlist(symbol);
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
  const companyDetails = await getCompanyDataFromSymol(symbol);

  return (
    <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <section className="grid w-full gap-8 home-section">
        <div className="md:col-span-1 xl:col-span-2 flex flex-col gap-8">
          <TradingViewWidget
            scriptUrl={`${scriptUrl}symbol-info.js`}
            config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
            height={170}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
            className="custom-chart"
            height={600}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={BASELINE_WIDGET_CONFIG(symbol)}
            className="custom-chart"
            height={600}
          />
        </div>

        {/* Right column */}
        <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-y-8">
          <div className="flex items-center justify-between">
            <WatchlistButton
              symbol={symbol.toUpperCase()}
              company={companyDetails?.name ?? ""}
              isInWatchlist={isInWatchlist}
            />
          </div>

          <TradingViewWidget
            scriptUrl={`${scriptUrl}technical-analysis.js`}
            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
            height={400}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}symbol-profile.js`}
            config={COMPANY_PROFILE_WIDGET_CONFIG(symbol)}
            height={440}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}financials.js`}
            config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)}
            height={464}
          />
        </div>
      </section>
    </div>
  );
}
