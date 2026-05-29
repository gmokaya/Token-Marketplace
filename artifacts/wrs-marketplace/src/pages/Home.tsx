import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const img = (name: string) => `${BASE}/theme/${name}`;

/* ── animated counter ─────────────────────────────────────── */
function useCounter(target: number, duration = 2200, active = false) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
      else setN(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return n;
}

/* ── accent colour (WRS green replaces Corzo red #d32525) ─── */
const ACCENT = "hsl(155 100% 18%)";

export default function Home() {
  const [scrolled, setScrolled]     = useState(false);
  const [statsOn, setStatsOn]       = useState(false);
  const statsRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsOn(true); },
      { threshold: 0.25 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const c1 = useCounter(20,   2200, statsOn);
  const c2 = useCounter(5,    2200, statsOn);
  const c3 = useCounter(97,   2200, statsOn);
  const c4 = useCounter(1200, 2200, statsOn);

  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out">
        <div style={{ fontFamily: "'Jost', sans-serif" }}>

          {/* ══════════════════════════════════════════════════════
              STICKY HEADER
          ══════════════════════════════════════════════════════ */}
          <header style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            background: scrolled ? "#161616" : "transparent",
            boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,.4)" : "none",
            transition: "background .3s, box-shadow .3s",
          }}>
            {/* top bar */}
            <div style={{ background: scrolled ? "transparent" : "#161616", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 38 }}>
                <div style={{ display: "flex", gap: 28 }}>
                  {["Investors", "API Docs", "Locations", "Contact"].map(t => (
                    <a key={t} href="#" style={{ color: "rgba(255,255,255,.5)", fontSize: 12, textDecoration: "none", letterSpacing: ".03em" }}
                       onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                       onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
                      {t}
                    </a>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {["facebook", "linkedin", "twitter"].map(s => (
                    <a key={s} href="#" style={{ color: "rgba(255,255,255,.4)", fontSize: 12, textDecoration: "none", letterSpacing: ".05em" }}
                       onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                       onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}>
                      {s}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            {/* main nav */}
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 72 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={`${BASE}/logo.svg`} alt="WRS" style={{ width: 34, height: 34, filter: "brightness(0) invert(1)" }} />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 18, letterSpacing: ".02em" }}>WRS Marketplace</span>
              </div>
              <nav style={{ display: "flex", gap: 36, alignItems: "center" }}>
                {([["01", "Platform", "#platform"], ["02", "Services", "#services"], ["03", "About", "#about"], ["04", "Contact", "#cta"]] as const).map(([n, label, href]) => (
                  <a key={n} href={href} style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 14, fontWeight: 500, display: "flex", gap: 5, alignItems: "center" }}
                     onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                     onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}>
                    <span style={{ color: ACCENT, fontSize: 11 }}>{n}</span>{label}
                  </a>
                ))}
              </nav>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Link href="/sign-in" data-testid="link-sign-in"
                  style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                  Sign In
                </Link>
                <Link href="/sign-up" data-testid="link-sign-up"
                  style={{ background: ACCENT, color: "#fff", padding: "11px 24px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  Get Started <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </header>

          {/* ══════════════════════════════════════════════════════
              HERO — Corzo Finance split layout
              Left: #161616 with text content
              Right: full bleed hero photo
          ══════════════════════════════════════════════════════ */}
          <section style={{ position: "relative", height: "100vh", minHeight: 640, display: "flex" }}>
            {/* left charcoal panel */}
            <div style={{ position: "absolute", inset: 0, right: "45%", background: "#161616", zIndex: 1 }} />
            {/* right photo panel */}
            <div style={{
              position: "absolute", inset: 0, left: "55%", zIndex: 1,
              backgroundImage: `url(${img("slider-1-bg-2.jpg")})`,
              backgroundSize: "cover", backgroundPosition: "center left",
            }} />
            {/* diagonal cut overlay */}
            <div style={{
              position: "absolute", top: 0, bottom: 0, left: "calc(55% - 120px)", width: 120, zIndex: 2,
              background: "linear-gradient(to right, #161616 60%, transparent 100%)",
            }} />

            {/* content */}
            <div style={{ position: "relative", zIndex: 3, maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%", display: "flex", alignItems: "center" }}>
              <div style={{ width: "55%", paddingTop: 110, paddingRight: 60 }}>
                {/* brand label */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: "rgba(255,255,255,.45)", fontSize: 13, fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                    WRS Marketplace
                  </span>
                </div>
                {/* main heading */}
                <h1 style={{ color: "#fff", fontWeight: 300, lineHeight: 1.0, margin: "0 0 28px", fontSize: "clamp(3.2rem, 7.5vw, 7rem)" }}>
                  Agricultural
                  <br />
                  <span style={{ fontWeight: 300 }}>Advisory</span>
                </h1>
                {/* red divider → green */}
                <div style={{ width: 45, height: 2, background: ACCENT, marginBottom: 28 }} />
                {/* sub-heading */}
                <p style={{ color: "rgba(255,255,255,.55)", fontSize: 20, fontWeight: 300, lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
                  Transforming distribution and trade with key capabilities in e-WR issuance, real-time auctions, and agricultural financing across East Africa.
                </p>
                {/* buttons */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <Link href="/sign-up" data-testid="button-cta-signup"
                    style={{ background: ACCENT, color: "#fff", padding: "19px 28px", textDecoration: "none", fontSize: 16, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}>
                    Our Services <ArrowRight size={18} />
                  </Link>
                  <Link href="/sign-in"
                    style={{ background: "#323232", color: "#fff", padding: "19px 28px", textDecoration: "none", fontSize: 16, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#1c1c1c"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#323232"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}>
                    Contact Us <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              SERVICE CARDS — white panel overlapping hero
              Exact Corzo: -72px overlap, 3 equal cols, icons + dot title + divider
          ══════════════════════════════════════════════════════ */}
          <section style={{ background: "#f5f5f5", paddingBottom: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                background: "#fff", marginTop: -72, position: "relative", zIndex: 10,
                boxShadow: "0 4px 40px rgba(0,0,0,.10)",
              }}>
                {([
                  { icon: "icon-tax.png",       title: "Spot Market",        sub: "For Producers",  desc: "Digitize your harvest. List eWRs on the live spot market and access financing against verified collateral." },
                  { icon: "icon-money-1.png",    title: "Live Auctions",      sub: "For Off-Takers", desc: "Bid in real-time sealed-bid auctions with automatic anti-snipe protection and transparent price discovery." },
                  { icon: "icon-financial-1.png",title: "Forward Contracts",  sub: "For Financiers", desc: "Monitor collateral portfolios in real time. Approve warehouse financing with full audit trails and lien tracking." },
                ] as const).map(({ icon, title, sub, desc }, i) => (
                  <div key={title} style={{
                    padding: "70px 44px 55px",
                    borderRight: i < 2 ? "1px solid #f0f0f0" : undefined,
                    backgroundImage: `url(${img("square00.png")})`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "top left",
                  }}>
                    <img src={img(icon)} alt={title} style={{ width: 46, marginBottom: 22 }} />
                    <h3 style={{ fontSize: 26, fontWeight: 500, color: "#353535", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, display: "inline-block", flexShrink: 0 }} />
                      {title}
                    </h3>
                    <p style={{ fontSize: 12, color: "#aaa", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 16 }}>{sub}</p>
                    <p style={{ fontSize: 17, color: "#696969", lineHeight: 1.7, margin: 0 }}>{desc}</p>
                    <div style={{ width: 60, height: 2, background: ACCENT, marginTop: 28 }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              ABOUT — #f5f5f5 split: image left, text right
          ══════════════════════════════════════════════════════ */}
          <section id="about" style={{ background: "#f5f5f5", padding: "100px 0 120px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              {/* left: image */}
              <div style={{ position: "relative" }}>
                <img src={img("iStock-1203044233.jpg")} alt="Agricultural trade" style={{ width: "100%", display: "block", objectFit: "cover" }} />
              </div>
              {/* right: text */}
              <div style={{ paddingLeft: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 13, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" }}>
                    The Platform
                  </span>
                </div>
                <h2 style={{ fontSize: "clamp(2rem,3.5vw,44px)", fontWeight: 500, color: "#090909", lineHeight: 1.15, margin: "0 0 24px" }}>
                  East Africa's<br />
                  Leading eWR Exchange
                </h2>
                <p style={{ fontSize: 18, color: "#353535", lineHeight: 1.75, marginBottom: 28 }}>
                  A wonderful serenity has taken possession of East Africa's agricultural trade. WRS Marketplace connects producers, off-takers, and financiers in a single, fully auditable trading environment — backed by licensed warehouses and an immutable ledger.
                </p>
                <ul style={{ padding: 0, margin: "0 0 32px", listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "§6.1 state-machine enforced eWR lifecycle",
                    "Real-time auctions with anti-snipe window",
                    "Forward contracts with performance bond escrow",
                    "Warehouse financing up to 60 % of market value",
                    "SHA-256 audit log on every transaction",
                  ].map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 16, color: "#555" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, marginTop: 8, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#platform" style={{ color: ACCENT, textDecoration: "none", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  More About Us <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              SERVICES SECTION HEADER — Corzo pattern:
              red vertical line → red dot label → heading
          ══════════════════════════════════════════════════════ */}
          <section id="services" style={{ background: "#fff", paddingTop: 80, paddingBottom: 0 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center", paddingBottom: 60 }}>
              {/* vertical divider */}
              <div style={{ width: 2, height: 40, background: ACCENT, margin: "0 auto 36px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ color: ACCENT, fontSize: 13, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" }}>
                  Our Expertise
                </span>
              </div>
              <h2 style={{ fontSize: "clamp(2rem,3.5vw,44px)", fontWeight: 500, color: "#353535", margin: 0 }}>
                Trading Services
              </h2>
            </div>

            {/* 4-column service cards with photo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
              {([
                { num: "01", img: "bg-service50.jpg",   title: "Spot Market",         desc: "Live price discovery with real-time order matching across 5 commodity classes." },
                { num: "02", img: "SVC-bg-black.jpg",    title: "Live Auctions",        desc: "SERIALIZABLE bids, anti-snipe windows, and expiry workers protect fair price formation." },
                { num: "03", img: "bg-frame-work.jpg",   title: "Forward Contracts",    desc: "Lock in future delivery prices. Co-signed bonds protect both parties through maturity." },
                { num: "04", img: "bg-counter.jpg",      title: "Warehouse Financing",  desc: "Collateral-backed advances up to 60 % of market value with real-time lien tracking." },
              ] as const).map(({ num, img: bgImg, title, desc }) => (
                <div key={num} style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
                  onMouseEnter={e => { const ov = e.currentTarget.querySelector(".svc-overlay") as HTMLElement; if (ov) ov.style.opacity = "1"; }}
                  onMouseLeave={e => { const ov = e.currentTarget.querySelector(".svc-overlay") as HTMLElement; if (ov) ov.style.opacity = "0"; }}>
                  <img src={img(bgImg)} alt={title} style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }} />
                  {/* always-visible bottom overlay */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "36px 36px 32px", background: "rgba(0,0,0,.72)", color: "#fff" }}>
                    <div style={{ fontSize: 13, color: "#a5a5a5", marginBottom: 8, fontWeight: 500 }}>{num}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>{title}</div>
                    <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                    <div className="svc-overlay" style={{ marginTop: 14, opacity: 0, transition: "opacity .25s" }}>
                      <Link href="/sign-up" style={{ color: ACCENT, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        Learn More <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              COUNTERS — bg-counter.jpg with dark overlay
          ══════════════════════════════════════════════════════ */}
          <section ref={statsRef} style={{
            position: "relative", padding: "90px 0",
            backgroundImage: `url(${img("bg-counter.jpg")})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,15,.82)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 40, textAlign: "center" }}>
                {([
                  { val: c1,  suf: "+", label: "eWRs Issued",         sub: "Active receipts on platform" },
                  { val: c2,  suf: "",  label: "Commodities",          sub: "Maize, Rice, Coffee, Tea, Avocado" },
                  { val: c3,  suf: "%", label: "Audit Coverage",        sub: "Fully traceable transactions" },
                  { val: c4,  suf: "+", label: "Transactions Processed",sub: "Since platform launch" },
                ] as const).map(({ val, suf, label, sub }) => (
                  <div key={label}>
                    <div style={{ fontSize: "clamp(2.5rem,5vw,4.5rem)", fontWeight: 300, color: "#fff", lineHeight: 1, marginBottom: 6 }}>
                      {val}<span style={{ fontSize: "clamp(1.5rem,3vw,2.5rem)", color: ACCENT }}>{suf}</span>
                    </div>
                    <div style={{ width: 32, height: 2, background: ACCENT, margin: "12px auto 12px" }} />
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              COMMODITIES / HOW IT WORKS — white bg, numbered
          ══════════════════════════════════════════════════════ */}
          <section id="platform" style={{ background: "#fff", padding: "100px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
              <div style={{ display: "flex", gap: 80, alignItems: "center" }}>
                {/* left: 4-step process */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                    <span style={{ color: ACCENT, fontSize: 13, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" }}>Process</span>
                  </div>
                  <h2 style={{ fontSize: "clamp(2rem,3vw,40px)", fontWeight: 500, color: "#090909", margin: "0 0 48px", lineHeight: 1.15 }}>
                    From Harvest to<br />Settlement in 4 Steps
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {([
                      ["01", "Intake & Grading",    "Commodity arrives at a licensed warehouse. WMS staff grade, weigh, and issue a digital eWR linked to physical stock."],
                      ["02", "List or Auction",     "Producer posts to the spot marketplace, creates a timed auction, or locks in a forward contract with a buyer."],
                      ["03", "Trade Executes",      "Bids clear or orders match. The §6.1 state machine transitions the eWR through MARKET_LISTED → SOLD automatically."],
                      ["04", "Settlement & Payout", "Platform fee withheld, bank lien cleared, producer receives net proceeds. Full audit trail immutably recorded."],
                    ] as const).map(([num, title, desc]) => (
                      <div key={num} style={{ display: "flex", gap: 28, paddingBottom: 32, borderBottom: "1px solid #f0f0f0", marginBottom: 32, alignItems: "flex-start" }}>
                        <div style={{ fontSize: 48, fontWeight: 300, color: "rgba(0,0,0,.08)", lineHeight: 1, flexShrink: 0, width: 72, textAlign: "right" }}>{num}</div>
                        <div>
                          <div style={{ width: 28, height: 2, background: ACCENT, marginBottom: 12 }} />
                          <h4 style={{ fontSize: 18, fontWeight: 600, color: "#353535", margin: "0 0 8px" }}>{title}</h4>
                          <p style={{ fontSize: 15, color: "#696969", lineHeight: 1.7, margin: 0 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* right: commodity grid */}
                <div style={{ flex: 1, maxWidth: 460 }}>
                  <img src={img("iStock-1134997420.jpg")} alt="Commodities" style={{ width: "100%", display: "block", marginBottom: 24 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                    {([
                      ["🌽", "Maize",   "Grade A–C"],
                      ["🌾", "Rice",    "Grade A–B"],
                      ["☕", "Coffee",  "AA–C"],
                      ["🍵", "Tea",     "BOPI/FNDC"],
                      ["🥑", "Avocado", "Hass Export"],
                      ["🌿", "Sorghum", "Grade A"],
                    ] as const).map(([emoji, name, grade]) => (
                      <div key={name} style={{ background: "#f8f8f8", padding: "16px 18px", borderLeft: `3px solid ${ACCENT}` }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#353535" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{grade}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              CTA — dark section, Corzo style
          ══════════════════════════════════════════════════════ */}
          <section id="cta" style={{
            background: "#161616",
            backgroundImage: `url(${img("bg-frame-work.jpg")})`,
            backgroundBlendMode: "multiply",
            backgroundSize: "cover", backgroundPosition: "center",
            padding: "100px 0",
          }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
              <div style={{ width: 2, height: 40, background: ACCENT, margin: "0 auto 32px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ color: ACCENT, fontSize: 13, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" }}>Get Started</span>
              </div>
              <h2 style={{ fontSize: "clamp(2.2rem,5vw,52px)", fontWeight: 300, color: "#fff", lineHeight: 1.1, margin: "0 0 24px" }}>
                Ready to Trade
                <br />
                <span style={{ fontWeight: 600 }}>with Confidence?</span>
              </h2>
              <p style={{ color: "rgba(255,255,255,.5)", fontSize: 18, fontWeight: 300, maxWidth: 560, margin: "0 auto 44px", lineHeight: 1.7 }}>
                Join producers, off-takers, and financiers already using WRS Marketplace to trade East African commodities with full transparency and legal certainty.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                <Link href="/sign-up" data-testid="button-cta-signup"
                  style={{ background: ACCENT, color: "#fff", padding: "20px 36px", textDecoration: "none", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                  Create Your Account <ArrowRight size={18} />
                </Link>
                <Link href="/sign-in" data-testid="link-sign-in"
                  style={{ background: "#323232", color: "#fff", padding: "20px 36px", textDecoration: "none", fontSize: 16, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#1c1c1c"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#323232"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}>
                  Sign In
                </Link>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              FOOTER
          ══════════════════════════════════════════════════════ */}
          <footer style={{ background: "#0c0c0c", padding: "70px 0 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, paddingBottom: 60, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <img src={`${BASE}/logo.svg`} alt="WRS" style={{ width: 30, filter: "brightness(0) invert(1)" }} />
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>WRS Marketplace</span>
                  </div>
                  <p style={{ color: "rgba(255,255,255,.35)", fontSize: 14, lineHeight: 1.8 }}>
                    East Africa's premier Electronic Warehouse Receipt trading platform for agricultural commodities.
                  </p>
                </div>
                {([
                  { label: "Platform", links: ["Marketplace", "Auctions", "Forwards", "Financing"] },
                  { label: "Users",    links: ["Producers", "Off-Takers", "Financiers", "Enablers"] },
                  { label: "Company",  links: ["About", "API Docs", "Contact"] },
                ] as const).map(({ label, links }) => (
                  <div key={label}>
                    <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 20 }}>{label}</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      {links.map(link => (
                        <li key={link}>
                          <Link href="/sign-in" style={{ color: "rgba(255,255,255,.5)", textDecoration: "none", fontSize: 14 }}>{link}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div style={{ padding: "24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "rgba(255,255,255,.25)", fontSize: 13, margin: 0 }}>© 2025 WRS Marketplace. All rights reserved.</p>
                <p style={{ color: "rgba(255,255,255,.15)", fontSize: 13, margin: 0 }}>Regulated agricultural commodity trading platform.</p>
              </div>
            </div>
          </footer>

        </div>
      </Show>
    </>
  );
}
