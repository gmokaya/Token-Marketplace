import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { PriceTicker } from "@/components/PriceTicker";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const img = (name: string) => `${BASE}/theme/${name}`;
const photo = (name: string) => `${BASE}/photos/${name}`;

const ACCENT = "hsl(155 100% 18%)";   // WRS green

/* ── smooth scroll helper ─────────────────────────────────── */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── animated counter ─────────────────────────────────────── */
function Counter({ target, suffix = "", active }: { target: number; suffix?: string; active: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 2000, 1);
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
      else setN(target);
    };
    requestAnimationFrame(tick);
  }, [target, active]);
  return <>{n.toLocaleString()}{suffix}</>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [statsOn, setStatsOn]   = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsOn(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out">
        <div style={{ fontFamily: "'Jost', sans-serif", color: "#353535" }}>

          {/* ══ NAVBAR ══════════════════════════════════════════════ */}
          <header style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
            background: scrolled ? "rgba(22,22,22,0.97)" : "transparent",
            backdropFilter: scrolled ? "blur(10px)" : "none",
            transition: "background 0.3s",
          }}>
            {/* thin top bar */}
            <div style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 36, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 24 }}>
                  {["Investors", "API Docs", "Contact"].map(t => (
                    <a key={t} href="#cta" onClick={e => { e.preventDefault(); scrollTo("cta"); }}
                      style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textDecoration: "none", letterSpacing: "0.05em" }}>
                      {t}
                    </a>
                  ))}
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: "0.04em" }}>East Africa's eWR Trading Platform</span>
              </div>
            </div>
            {/* main nav */}
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={`${BASE}/logo.svg`} alt="WRS" style={{ width: 32, height: 32, filter: "brightness(0) invert(1)" }} />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 17, letterSpacing: "0.01em" }}>WRS Marketplace</span>
              </div>
              {/* numbered links */}
              <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
                {([ ["01","Platform","platform"], ["02","Services","services"], ["03","About","about"], ["04","Contact","cta"] ] as const).map(([n, label, id]) => (
                  <button key={n} onClick={() => scrollTo(id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: 500, display: "flex", gap: 5, alignItems: "center", fontFamily: "'Jost',sans-serif", padding: 0 }}>
                    <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600 }}>{n}</span>{label}
                  </button>
                ))}
              </nav>
              {/* auth buttons */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                  Sign In
                </Link>
                <Link href="/sign-up"
                  style={{ background: ACCENT, color: "#fff", padding: "10px 22px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                  Get Started <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </header>

          {/* ══ HERO ════════════════════════════════════════════════ */}
          <section style={{ position: "relative", height: "100vh", minHeight: 600, display: "flex", alignItems: "center" }}>
            {/* left charcoal panel */}
            <div style={{ position: "absolute", inset: 0, right: "42%", background: "#161616", zIndex: 1 }} />
            {/* right panel — East African farmer photo */}
            <div style={{
              position: "absolute", inset: 0, left: "58%", zIndex: 1,
              backgroundImage: `url(${photo("hero-soybean-farmer.jpg")})`,
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            {/* WRS brand green overlay over the photo for cohesion + legibility */}
            <div style={{
              position: "absolute", inset: 0, left: "58%", zIndex: 1,
              background: "linear-gradient(145deg, hsl(155 80% 10% / 0.74) 0%, hsl(155 100% 6% / 0.82) 60%, hsl(130 60% 8% / 0.72) 100%)",
            }} />
            {/* subtle dot-grid pattern overlay */}
            <div style={{
              position: "absolute", inset: 0, left: "58%", zIndex: 2,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }} />
            {/* stat card floating in right panel */}
            <div style={{
              position: "absolute", top: "50%", left: "calc(58% + 48px)", transform: "translateY(-50%)",
              zIndex: 3, display: "flex", flexDirection: "column", gap: 16,
            }}>
              {([
                { v: "20+",  l: "eWRs Issued" },
                { v: "97%",  l: "Audit Coverage" },
                { v: "5",    l: "Commodities" },
              ] as const).map(({ v, l }) => (
                <div key={l} style={{
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)", padding: "18px 28px", minWidth: 170,
                }}>
                  <div style={{ fontSize: 32, fontWeight: 300, color: "#fff", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* diagonal fade from left panel into right */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(58% - 120px)", width: 180, zIndex: 4, background: "linear-gradient(to right, #161616 40%, transparent 100%)" }} />

            {/* hero content (left side) */}
            <div style={{ position: "relative", zIndex: 3, maxWidth: 1200, margin: "0 auto", padding: "0 32px", width: "100%" }}>
              <div style={{ maxWidth: 560 }}>
                {/* brand label */}
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 24 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase" }}>WRS Marketplace</span>
                </div>
                {/* heading */}
                <h1 style={{ color: "#fff", fontWeight: 300, lineHeight: 1.02, margin: "0 0 24px", fontSize: "clamp(3rem, 6.5vw, 6.2rem)" }}>
                  Agricultural
                  <br />Advisory
                </h1>
                {/* accent line */}
                <div style={{ width: 45, height: 2, background: ACCENT, marginBottom: 24 }} />
                {/* sub */}
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 18, fontWeight: 300, lineHeight: 1.75, margin: "0 0 36px" }}>
                  Trade Electronic Warehouse Receipts securely. Live auctions, forward contracts, and warehouse financing across East Africa.
                </p>
                {/* CTAs */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Link href="/sign-up"
                    style={{ background: ACCENT, color: "#fff", padding: "16px 28px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    Join the Marketplace <ArrowRight size={16} />
                  </Link>
                  <button onClick={() => scrollTo("services")}
                    style={{ background: "#323232", color: "#fff", padding: "16px 28px", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, fontFamily: "'Jost',sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    Our Services <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ══ SERVICE CARDS ════════════════════════════════════════
              White panel overlapping hero by −72px, 3 columns
              Exact Corzo: icon → red-dot title → text → divider
          ════════════════════════════════════════════════════════ */}
          <section id="services" style={{ background: "#f5f5f5" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                background: "#fff", marginTop: -72, position: "relative", zIndex: 10,
                boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
              }}>
                {([
                  { icon: "icon-tax.png",        title: "Spot Market",       sub: "For Producers",  desc: "List your eWRs on the live marketplace. Access transparent pricing and verified buyers instantly." },
                  { icon: "icon-money-1.png",     title: "Live Auctions",     sub: "For Off-Takers", desc: "Compete in real-time sealed-bid auctions with automatic anti-snipe protection and fair price discovery." },
                  { icon: "icon-financial-1.png", title: "Forward Contracts", sub: "For Financiers", desc: "Lock in future delivery prices with performance-bond escrow and immutable audit trails." },
                ] as const).map(({ icon, title, sub, desc }, i) => (
                  <div key={title} style={{
                    padding: "64px 40px 52px",
                    borderRight: i < 2 ? "1px solid #f0f0f0" : undefined,
                  }}>
                    <img src={img(icon)} alt={title} style={{ width: 44, marginBottom: 20 }} />
                    <h3 style={{ fontSize: 24, fontWeight: 600, color: "#232323", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, display: "inline-block", flexShrink: 0 }} />
                      {title}
                    </h3>
                    <p style={{ fontSize: 12, color: "#bbb", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px 14px" }}>{sub}</p>
                    <p style={{ fontSize: 16, color: "#696969", lineHeight: 1.75, margin: 0 }}>{desc}</p>
                    <div style={{ width: 56, height: 2, background: ACCENT, marginTop: 24 }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ ABOUT ════════════════════════════════════════════════ */}
          <section id="about" style={{ background: "#f5f5f5", padding: "96px 0 104px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
              <div>
                <img src={photo("about-planting.jpg")} alt="East African farmer planting in the field" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "4 / 3" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>The Platform</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#090909", lineHeight: 1.18, margin: "0 0 20px" }}>
                  East Africa's Leading<br />eWR Exchange
                </h2>
                <p style={{ fontSize: 17, color: "#555", lineHeight: 1.8, marginBottom: 28 }}>
                  WRS Marketplace connects producers, off-takers, and financiers in a single, fully auditable trading environment — backed by licensed warehouses and an immutable transaction ledger.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 11 }}>
                  {[
                    "§6.1 state-machine enforced eWR lifecycle",
                    "Real-time auctions with anti-snipe window",
                    "Forward contracts with performance bond escrow",
                    "Warehouse financing up to 60% of market value",
                    "SHA-256 audit log on every transaction",
                  ].map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "#555" }}>
                      <ChevronRight size={16} style={{ color: ACCENT, marginTop: 3, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" style={{ color: ACCENT, textDecoration: "none", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, letterSpacing: "0.02em" }}>
                  Get Started <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>

          {/* ══ PLATFORM / HOW IT WORKS ─────────────────────────── */}
          <section id="platform" style={{ background: "#fff", padding: "96px 0 104px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              {/* section header */}
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div style={{ width: 2, height: 40, background: ACCENT, margin: "0 auto 28px" }} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>How It Works</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#232323", margin: 0 }}>
                  From Harvest to Settlement
                </h2>
              </div>
              {/* 4-step grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
                {([
                  ["01", "Intake & Grading",     "Commodity arrives at a licensed warehouse. WMS staff grade, weigh, and issue a digital eWR linked to physical stock."],
                  ["02", "List or Auction",       "Producer posts to the spot marketplace, creates a timed auction, or locks in a forward contract with a buyer."],
                  ["03", "Trade Executes",        "Bids clear or orders match. The state machine transitions the eWR through MARKET_LISTED → SOLD automatically."],
                  ["04", "Settlement & Payout",   "Platform fee withheld, bank lien cleared, producer receives net proceeds. Full audit trail immutably recorded."],
                ] as const).map(([num, title, desc], i) => (
                  <div key={num} style={{ padding: "40px 36px 40px", borderLeft: i > 0 ? "1px solid #f0f0f0" : undefined, position: "relative" }}>
                    <div style={{ fontSize: 52, fontWeight: 300, color: "rgba(0,0,0,0.06)", lineHeight: 1, marginBottom: 12 }}>{num}</div>
                    <div style={{ width: 28, height: 2, background: ACCENT, marginBottom: 14 }} />
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: "#232323", margin: "0 0 10px" }}>{title}</h4>
                    <p style={{ fontSize: 14, color: "#777", lineHeight: 1.75, margin: 0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ COUNTERS ─────────────────────────────────────────── */}
          <section ref={statsRef} style={{
            position: "relative", padding: "80px 0",
            backgroundImage: `url(${img("bg-counter.jpg")})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,12,0.82)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 40, textAlign: "center" }}>
                {([
                  { target: 20,   suffix: "+", label: "eWRs Issued" },
                  { target: 5,    suffix: "",  label: "Commodities" },
                  { target: 97,   suffix: "%", label: "Audit Coverage" },
                  { target: 1200, suffix: "+", label: "Transactions" },
                ] as const).map(({ target, suffix, label }) => (
                  <div key={label}>
                    <div style={{ fontSize: "clamp(2.4rem,4.5vw,4rem)", fontWeight: 300, color: "#fff", lineHeight: 1, marginBottom: 4 }}>
                      <Counter target={target} suffix={suffix} active={statsOn} />
                    </div>
                    <div style={{ width: 30, height: 2, background: ACCENT, margin: "12px auto" }} />
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ COMMODITIES GRID ─────────────────────────────────── */}
          <section style={{ background: "#f5f5f5", padding: "96px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ marginBottom: 52, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                    <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Traded Commodities</span>
                  </div>
                  <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 36px)", fontWeight: 500, color: "#232323", margin: 0 }}>Available Markets</h2>
                </div>
                <Link href="/sign-up" style={{ color: ACCENT, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  View All <ArrowRight size={14} />
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
                {([
                  { e: "🌽", name: "Maize",   grade: "Grade A–C",    desc: "White & Yellow, 90-day storage backed" },
                  { e: "🌾", name: "Rice",    grade: "Grade A–B",    desc: "Milled & paddy, certified warehouses" },
                  { e: "☕", name: "Coffee",  grade: "AA / AB / PB", desc: "Washed & natural process, export ready" },
                  { e: "🍵", name: "Tea",     grade: "BOPI / FNDC",  desc: "Orthodox & CTC, Mombasa auction listed" },
                  { e: "🥑", name: "Avocado", grade: "Hass Export",  desc: "Cold-chain certified, EU/UK market grade" },
                  { e: "🌿", name: "Sorghum", grade: "Grade A",      desc: "Food & feed grade, long shelf life" },
                ] as const).map(({ e, name, grade, desc }) => (
                  <div key={name} style={{ background: "#fff", padding: "28px 28px 24px", borderLeft: `3px solid ${ACCENT}`, transition: "box-shadow 0.2s" }}
                    onMouseEnter={e2 => (e2.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.09)")}
                    onMouseLeave={e2 => (e2.currentTarget.style.boxShadow = "none")}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{e}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#232323", marginBottom: 2 }}>{name}</div>
                    <div style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{grade}</div>
                    <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ CTA ─────────────────────────────────────────────── */}
          <section id="cta" style={{
            position: "relative", padding: "96px 0",
            backgroundImage: `url(${photo("cta-harvest.jpg")})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.85)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
              <div style={{ width: 2, height: 40, background: ACCENT, margin: "0 auto 28px" }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Get Started</span>
              </div>
              <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 48px)", fontWeight: 300, color: "#fff", lineHeight: 1.1, margin: "0 0 20px" }}>
                Ready to Trade<br /><strong style={{ fontWeight: 700 }}>with Confidence?</strong>
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, fontWeight: 300, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.8 }}>
                Join producers, off-takers, and financiers already using WRS Marketplace to trade East African commodities with full transparency.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                <Link href="/sign-up"
                  style={{ background: ACCENT, color: "#fff", padding: "17px 32px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Create Your Account <ArrowRight size={16} />
                </Link>
                <Link href="/sign-in"
                  style={{ background: "#2a2a2a", color: "#fff", padding: "17px 32px", textDecoration: "none", fontSize: 15, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Sign In
                </Link>
              </div>
            </div>
          </section>

          {/* ══ FOOTER ──────────────────────────────────────────── */}
          <footer style={{ background: "#0d0d0d", padding: "64px 0 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, paddingBottom: 52, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                    <img src={`${BASE}/logo.svg`} alt="WRS" style={{ width: 28, filter: "brightness(0) invert(1)" }} />
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>WRS Marketplace</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: 1.9, margin: 0 }}>
                    East Africa's premier Electronic Warehouse Receipt trading platform for agricultural commodities.
                  </p>
                </div>
                {([
                  { label: "Platform", links: [["Marketplace","/sign-in"],["Auctions","/sign-in"],["Forwards","/sign-in"],["Financing","/sign-in"]] },
                  { label: "Users",    links: [["Producers","/sign-up"],["Off-Takers","/sign-up"],["Financiers","/sign-up"]] },
                  { label: "Company",  links: [["About","#about"],["Contact","#cta"]] },
                ] as const).map(({ label, links }) => (
                  <div key={label}>
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>{label}</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {links.map(([name, href]) => (
                        <li key={name}>
                          {href.startsWith("#")
                            ? <button onClick={() => scrollTo(href.slice(1))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "'Jost',sans-serif", padding: 0 }}>{name}</button>
                            : <Link href={href as string} style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: 13 }}>{name}</Link>
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div style={{ padding: "22px 0 66px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>© 2025 WRS Marketplace. All rights reserved.</p>
                <p style={{ color: "rgba(255,255,255,0.12)", fontSize: 12, margin: 0 }}>Regulated agricultural commodity trading platform.</p>
              </div>
            </div>
          </footer>

          {/* ══ LIVE COMMODITY PRICE TICKER (fixed bottom) ═════════ */}
          <PriceTicker />

        </div>
      </Show>
    </>
  );
}
