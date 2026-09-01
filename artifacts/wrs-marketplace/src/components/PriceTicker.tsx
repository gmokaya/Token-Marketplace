import { useEffect, useState } from "react";

const ACCENT = "hsl(180 62% 10%)";
const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const REFRESH_MS = 5 * 60 * 1000;

type MarketClose = {
  commodityType: "MAIZE" | "RICE" | "COFFEE" | "TEA" | "AVOCADO";
  displayName: string;
  closePriceUsdPerMt: number;
  previousClosePriceUsdPerMt: number | null;
  changePct: number | null;
  tradedVolumeMt: number;
  turnoverUsd: number;
  tradeCount: number;
  sourceMarkets: string[];
  sourceTimestamp: string;
  tradingDate: string;
  isStale: boolean;
  isComplete: boolean;
};

type MarketCloseFeed = {
  asOfTradingDate: string;
  timezone: "Africa/Nairobi";
  cutoffTime: string;
  calculatedAt: string;
  closes: MarketClose[];
};

const COMMODITY_ICONS: Record<MarketClose["commodityType"], string> = {
  MAIZE: "🌾",
  RICE: "🥜",
  COFFEE: "☕",
  TEA: "🍵",
  AVOCADO: "🥑",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function PriceTicker() {
  const [feed, setFeed] = useState<MarketCloseFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(`${API}/api/market-data/daily-closes`);
        if (!response.ok) throw new Error(`Market close feed failed: ${response.status}`);
        const data = (await response.json()) as MarketCloseFeed;
        if (!active) return;
        setFeed(data);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const quotes = feed?.closes ?? [];
  const track = [...quotes, ...quotes];
  const emptyMessage = loading
    ? "Loading official market closes"
    : error && !feed
      ? "Official market close feed unavailable"
      : `No settled trades through ${feed ? fmtDate(feed.asOfTradingDate) : "the latest trading day"}`;

  return (
    <>
      <style>{`
        @keyframes wrs-ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .wrs-ticker-track {
          display: inline-flex;
          align-items: center;
          animation: wrs-ticker-scroll 38s linear infinite;
          will-change: transform;
        }
        .wrs-ticker:hover .wrs-ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .wrs-ticker-track { animation: none !important; }
          .wrs-ticker-pulse { animation: none !important; }
        }
      `}</style>

      <div
        className="wrs-ticker"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 250,
          height: 44, background: "rgba(13,13,13,0.97)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "stretch", overflow: "hidden",
          fontFamily: "'Jost', sans-serif",
        }}
      >
        {/* official close label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 18px",
          background: ACCENT, color: "#fff", flexShrink: 0,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          <span className="wrs-ticker-pulse" style={{
            display: "block", width: 7, height: 7, borderRadius: "50%", background: "#fff",
            animation: quotes.length > 0 ? "wrs-pulse 1.6s ease-out infinite" : "none",
          }} />
          Official Close
        </div>
        <style>{`
          @keyframes wrs-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
            70%  { box-shadow: 0 0 0 7px rgba(255,255,255,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          }
        `}</style>

        <div
          aria-live="polite"
          style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}
        >
          {quotes.length === 0 ? (
            <div style={{ padding: "0 22px", color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
              {emptyMessage}
            </div>
          ) : (
            <div className="wrs-ticker-track" title={error ? "Latest refresh failed; showing the last successful official close." : undefined}>
              {track.map((q, i) => {
                const up = q.changePct !== null && q.changePct >= 0;
                const color = q.changePct === null
                  ? "rgba(255,255,255,0.45)"
                  : up
                    ? "hsl(180 50% 55%)"
                    : "hsl(0 75% 62%)";
              return (
                <div key={`${q.commodityType}-${q.tradingDate}-${i}`} title={`${q.tradeCount} settled trade${q.tradeCount === 1 ? "" : "s"} · ${q.tradedVolumeMt.toFixed(3)} MT · ${q.sourceMarkets.join(", ")}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "0 26px", borderRight: "1px solid rgba(255,255,255,0.07)",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 15 }}>{COMMODITY_ICONS[q.commodityType]}</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
                    {q.displayName}
                  </span>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                    ${fmt(q.closePriceUsdPerMt)}<span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>/MT</span>
                  </span>
                  <span style={{ color, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {q.changePct === null ? "NEW" : `${up ? "▲" : "▼"} ${Math.abs(q.changePct).toFixed(2)}%`}
                  </span>
                  <span style={{ color: q.isStale ? "hsl(42 80% 65%)" : "rgba(255,255,255,0.38)", fontSize: 10, letterSpacing: "0.04em" }}>
                    {q.isStale ? "STALE · " : ""}{fmtDate(q.tradingDate)}
                  </span>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
