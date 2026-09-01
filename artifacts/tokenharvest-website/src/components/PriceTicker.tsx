import { useEffect, useState } from "react";

const ACCENT = "hsl(180 62% 10%)";
const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type Quote = {
  e: string;
  name: string;
  open: number;   // session-open reference price (USD / MT)
  price: number;  // current price
};

type TickerItem = { e: string; name: string; open: number };

const SEED: TickerItem[] = [
  { e: "🌾", name: "Grain",   open: 282 },
  { e: "🥜", name: "Nuts",    open: 585 },
  { e: "☕", name: "Coffee",  open: 4210 },
  { e: "🍵", name: "Tea",     open: 2640 },
  { e: "🥑", name: "Avocado", open: 1455 },
  { e: "🌿", name: "Sorghum", open: 264 },
  { e: "🌾", name: "Wheat",   open: 318 },
  { e: "🫘", name: "Soybean", open: 540 },
];

function displayCommodityName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "maize") return "Grain";
  if (normalized === "rice") return "Nuts";
  return name;
}

function seedToQuotes(items: TickerItem[]): Quote[] {
  return items.map(q => ({
    ...q,
    name: displayCommodityName(q.name),
    price: Math.round(q.open * (1 + (Math.random() - 0.5) * 0.03)),
  }));
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function PriceTicker() {
  const [quotes, setQuotes] = useState<Quote[]>(() => seedToQuotes(SEED));

  // Load CMS ticker prices; replace seed if found
  useEffect(() => {
    fetch(`${API}/api/content/ticker`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const items: TickerItem[] | undefined = d?.value?.items;
        if (items?.length) setQuotes(seedToQuotes(items));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setQuotes(prev =>
        prev.map(q => {
          // small random walk, gently mean-reverting toward open (±4% band)
          const drift = (q.open - q.price) * 0.04;
          const noise = q.open * (Math.random() - 0.5) * 0.012;
          const next = Math.max(q.open * 0.9, q.price + drift + noise);
          return { ...q, price: Math.round(next) };
        })
      );
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // duplicate the list so the marquee loops seamlessly
  const track = [...quotes, ...quotes];

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
        {/* live label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 18px",
          background: ACCENT, color: "#fff", flexShrink: 0,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          <span className="wrs-ticker-pulse" style={{
            display: "block", width: 7, height: 7, borderRadius: "50%", background: "#fff",
            animation: "wrs-pulse 1.6s ease-out infinite",
          }} />
          Live Markets
        </div>
        <style>{`
          @keyframes wrs-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
            70%  { box-shadow: 0 0 0 7px rgba(255,255,255,0); }
            100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
          }
        `}</style>

        {/* scrolling quotes */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div className="wrs-ticker-track">
            {track.map((q, i) => {
              const change = q.price - q.open;
              const pct = (change / q.open) * 100;
              const up = change >= 0;
              const color = up ? "hsl(180 50% 55%)" : "hsl(0 75% 62%)";
              return (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "0 26px", borderRight: "1px solid rgba(255,255,255,0.07)",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 15 }}>{q.e}</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
                    {q.name}
                  </span>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                    ${fmt(q.price)}<span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>/MT</span>
                  </span>
                  <span style={{ color, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
