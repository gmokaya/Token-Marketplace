import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  Wheat, ShoppingCart, Landmark, CheckCircle2,
  TrendingUp, Shield, Gavel, FileText, ArrowRight, ChevronDown,
} from "lucide-react";

function useCounter(target: number, duration = 2000, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let startTime: number | null = null;
    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return count;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsActive(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const cEwrs      = useCounter(20, 2000, statsActive);
  const cCommodity = useCounter(5,  2000, statsActive);
  const cSettle    = useCounter(48, 2000, statsActive);
  const cAudit     = useCounter(97, 2000, statsActive);

  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen font-sans">

          {/* ── NAVBAR ─────────────────────────────────────── */}
          <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
              scrolled ? "bg-[#071a0d] shadow-xl" : "bg-transparent"
            }`}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="WRS" className="w-8 h-8 brightness-0 invert" />
                <span className="text-white font-semibold text-lg tracking-wide">WRS Marketplace</span>
              </div>

              <nav className="hidden md:flex items-center gap-8">
                {(["Platform","Commodities","How It Works","Get Started"] as const).map((item, i) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                  >
                    <span className="text-green-400 text-xs mr-1">0{i + 1}</span>
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex gap-3 items-center">
                <Link
                  href="/sign-in"
                  data-testid="link-sign-in"
                  className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  data-testid="link-sign-up"
                  className="bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Get Started →
                </Link>
              </div>
            </div>
          </header>

          {/* ── HERO ───────────────────────────────────────── */}
          <section
            className="relative h-screen min-h-[640px] flex items-center"
            style={{ background: "linear-gradient(135deg,#071a0d 0%,#0c2415 60%,#071a0d 100%)" }}
          >
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase">
                    TokenHarvest · Agricultural Finance
                  </span>
                </div>

                <h1
                  className="text-white leading-[1.05] font-light mb-6"
                  style={{ fontSize: "clamp(2.8rem,7vw,5.5rem)" }}
                >
                  The Precision
                  <br />
                  <span className="font-semibold text-green-400">Trading Desk</span>
                  <br />
                  For African Agriculture.
                </h1>

                <p className="text-white/55 text-lg md:text-xl leading-relaxed mb-10 max-w-xl font-light">
                  Trade Electronic Warehouse Receipts (eWRs) securely. Access real-time spot
                  markets, live auctions, and forward contracts for Maize, Rice, Coffee, Tea,
                  and Avocado.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/sign-up"
                    data-testid="button-cta-signup"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity"
                  >
                    Join the Marketplace <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="#platform"
                    className="inline-flex items-center gap-2 border border-white/25 text-white/75 hover:border-white hover:text-white px-8 py-4 text-base font-medium transition-colors"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25">
              <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </div>
          </section>

          {/* ── SERVICE CARDS (overlap hero) ───────────────── */}
          <section className="relative z-20 max-w-7xl mx-auto px-6 md:px-10 -mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 shadow-2xl">
              {([
                {
                  Icon: Wheat,
                  label: "For Producers",
                  title: "Digitize Your Harvest",
                  desc: "Tokenize grain into eWRs, list on the spot market, create auction blocks or forward contracts, and unlock financing against verified collateral.",
                },
                {
                  Icon: ShoppingCart,
                  label: "For Off-Takers",
                  title: "Source With Confidence",
                  desc: "Browse verified commodity lots, bid in live auctions, execute forward contracts, and track delivery with end-to-end settlement assurance.",
                },
                {
                  Icon: Landmark,
                  label: "For Financiers",
                  title: "Deploy Capital Safely",
                  desc: "Monitor unencumbered collateral in real time, approve warehouse financing with full audit trails, and mitigate credit risk at every step.",
                },
              ] as const).map(({ Icon, label, title, desc }) => (
                <div
                  key={label}
                  className="p-10 bg-white border-r last:border-r-0 border-border group hover:bg-[#071a0d] transition-colors duration-300"
                >
                  <Icon className="w-10 h-10 text-primary group-hover:text-green-400 mb-6 transition-colors" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-green-400 flex-shrink-0 transition-colors" />
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-white/40 tracking-[0.18em] uppercase transition-colors">
                      {label}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-white mb-3 transition-colors">
                    {title}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-white/55 text-sm leading-relaxed transition-colors">
                    {desc}
                  </p>
                  <div className="mt-6 w-12 h-0.5 bg-primary group-hover:bg-green-400 transition-colors" />
                </div>
              ))}
            </div>
          </section>

          {/* ── PLATFORM / ABOUT ────────────────────────────── */}
          <section
            id="platform"
            className="py-32"
            style={{ background: "#071a0d" }}
          >
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-white/40 text-[10px] font-semibold tracking-[0.2em] uppercase">
                      The Platform
                    </span>
                  </div>
                  <h2
                    className="text-white leading-tight mb-6 font-light"
                    style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
                  >
                    A Complete eWR
                    <br />
                    <span className="font-semibold">Commodity Exchange.</span>
                  </h2>
                  <p className="text-white/50 leading-relaxed mb-8 font-light text-lg">
                    WRS Marketplace operates on a non-tokenized ledger architecture — every
                    Electronic Warehouse Receipt is a digital title backed by physical grain
                    in a licensed warehouse. Our platform connects producers, off-takers, and
                    financiers in a single, auditable trading environment.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "§6.1 state-machine enforced eWR lifecycle",
                      "Real-time auction engine with anti-snipe protection",
                      "Forward contracts with performance bond escrow",
                      "Warehouse financing up to 60% of market value",
                      "Immutable SHA-256 audit log on every action",
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                        <span className="text-white/55 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {([
                    {
                      Icon: TrendingUp,
                      title: "Spot Market",
                      desc: "Live price discovery with real-time order matching across 5 commodity classes.",
                    },
                    {
                      Icon: Gavel,
                      title: "Live Auctions",
                      desc: "Timed auctions with SERIALIZABLE bids and automatic anti-snipe window extension.",
                    },
                    {
                      Icon: FileText,
                      title: "Forward Contracts",
                      desc: "Lock in future delivery prices with co-signed performance bond protection.",
                    },
                    {
                      Icon: Shield,
                      title: "Secure Financing",
                      desc: "Collateral-backed loans with real-time lien status and 60% LTV ceiling.",
                    },
                  ] as const).map(({ Icon, title, desc }) => (
                    <div
                      key={title}
                      className="p-6 border border-white/10 hover:border-white/25 transition-colors"
                    >
                      <Icon className="w-6 h-6 mb-4 text-green-400" />
                      <h4 className="text-white font-semibold mb-2 text-sm">{title}</h4>
                      <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ────────────────────────────────── */}
          <section id="how-it-works" className="py-32 bg-[#f7faf8]">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase">
                    How It Works
                  </span>
                </div>
                <h2
                  className="text-foreground leading-tight font-light"
                  style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
                >
                  From Harvest to{" "}
                  <span className="font-semibold">Settlement in 4 Steps.</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    num: "01",
                    title: "Intake & Grading",
                    desc: "Commodity arrives at a licensed warehouse. WMS staff grade, weigh, and issue a digital eWR receipt linked to physical stock.",
                  },
                  {
                    num: "02",
                    title: "List or Auction",
                    desc: "Producer posts to the spot marketplace, creates a timed auction, or locks in a forward contract with an off-taker.",
                  },
                  {
                    num: "03",
                    title: "Trade Executes",
                    desc: "Bids clear or orders match. The §6.1 state machine transitions the eWR through MARKET_LISTED → SOLD automatically.",
                  },
                  {
                    num: "04",
                    title: "Settlement & Payout",
                    desc: "Platform fee withheld, bank lien cleared, producer receives net proceeds. Full audit trail immutably recorded.",
                  },
                ].map(({ num, title, desc }) => (
                  <div
                    key={num}
                    className="p-10 border-r last:border-r-0 border-b md:last:border-r md:border-b-0 lg:border-b-0 border-border"
                  >
                    <div
                      className="text-6xl font-light text-primary/20 mb-6"
                      style={{ lineHeight: 1 }}
                    >
                      {num}
                    </div>
                    <div className="w-8 h-0.5 bg-primary mb-6" />
                    <h3 className="font-semibold text-foreground mb-3 text-base">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── STATS COUNTERS ──────────────────────────────── */}
          <section ref={statsRef} className="py-28" style={{ background: "#0c2415" }}>
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                {[
                  { value: cEwrs,      suffix: "",  label: "eWRs Issued",    desc: "Active receipts on platform" },
                  { value: cCommodity, suffix: "",  label: "Commodities",     desc: "Maize, Rice, Coffee, Tea, Avocado" },
                  { value: cSettle,    suffix: "h", label: "Avg. Settlement", desc: "Hours to clear a transaction" },
                  { value: cAudit,     suffix: "%", label: "Audit Coverage",  desc: "Fully traceable transactions" },
                ].map(({ value, suffix, label, desc }) => (
                  <div key={label}>
                    <div className="text-5xl font-light text-white mb-2">
                      {value}
                      <span className="text-3xl text-green-400">{suffix}</span>
                    </div>
                    <div className="w-8 h-0.5 mx-auto mb-3 bg-green-400" />
                    <div className="text-white font-semibold mb-1 text-sm">{label}</div>
                    <div className="text-white/40 text-xs">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── COMMODITIES ─────────────────────────────────── */}
          <section id="commodities" className="py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="flex flex-col lg:flex-row gap-16 items-center">
                <div className="lg:w-1/2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase">
                      Commodities
                    </span>
                  </div>
                  <h2
                    className="text-foreground leading-tight mb-6 font-light"
                    style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}
                  >
                    East Africa's
                    <br />
                    <span className="font-semibold">Principal Crops.</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-8">
                    Every listed commodity is physically stored, graded, and insured at a
                    certified WRS warehouse. Electronic receipts carry full provenance — grade,
                    weight, location, and moisture content.
                  </p>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Browse the Marketplace <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="lg:w-1/2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { name: "Maize",    grade: "Grade A–C",  emoji: "🌽" },
                    { name: "Rice",     grade: "Grade A–B",  emoji: "🌾" },
                    { name: "Coffee",   grade: "AA–C",       emoji: "☕" },
                    { name: "Tea",      grade: "BOPI/FNDC",  emoji: "🍵" },
                    { name: "Avocado",  grade: "Hass Export",emoji: "🥑" },
                    { name: "Sorghum",  grade: "Grade A",    emoji: "🌿" },
                  ].map(({ name, grade, emoji }) => (
                    <div
                      key={name}
                      className="p-6 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group cursor-pointer"
                    >
                      <div className="text-3xl mb-3">{emoji}</div>
                      <div className="font-semibold text-foreground group-hover:text-primary text-sm transition-colors">
                        {name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{grade}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ─────────────────────────────────────────── */}
          <section id="get-started" className="py-32" style={{ background: "#071a0d" }}>
            <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-white/40 text-[10px] font-semibold tracking-[0.2em] uppercase">
                  Get Started
                </span>
              </div>
              <h2
                className="text-white leading-tight mb-6 font-light"
                style={{ fontSize: "clamp(2.5rem,5vw,4rem)" }}
              >
                Ready to Trade
                <br />
                <span className="font-bold">with Confidence?</span>
              </h2>
              <p className="text-white/50 mb-10 max-w-xl mx-auto text-lg font-light">
                Join producers, off-takers, and financiers already using WRS Marketplace to
                trade East African commodities with full transparency.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/sign-up"
                  data-testid="button-cta-signup"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 text-base font-semibold hover:opacity-90 transition-opacity"
                >
                  Create Your Account <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/sign-in"
                  data-testid="link-sign-in"
                  className="inline-flex items-center gap-2 border border-white/25 text-white/75 hover:border-white hover:text-white px-10 py-5 text-base font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </section>

          {/* ── FOOTER ──────────────────────────────────────── */}
          <footer className="py-16" style={{ background: "#041008" }}>
            <div className="max-w-7xl mx-auto px-6 md:px-10">
              <div className="flex flex-col md:flex-row justify-between items-start gap-12 pb-12 border-b border-white/10">
                <div className="max-w-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <img src="/logo.svg" alt="WRS" className="w-7 h-7 brightness-0 invert" />
                    <span className="text-white font-semibold">WRS Marketplace</span>
                  </div>
                  <p className="text-white/40 text-sm leading-relaxed">
                    East Africa's premier Electronic Warehouse Receipt trading platform for
                    agricultural commodities.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  {[
                    {
                      label: "Platform",
                      links: ["Marketplace", "Auctions", "Forwards", "Financing"],
                    },
                    {
                      label: "Users",
                      links: ["Producers", "Off-Takers", "Financiers", "Enablers"],
                    },
                    {
                      label: "Company",
                      links: ["About", "API Docs", "Contact"],
                    },
                  ].map(({ label, links }) => (
                    <div key={label}>
                      <div className="text-white/30 text-[10px] font-semibold tracking-[0.18em] uppercase mb-4">
                        {label}
                      </div>
                      <ul className="space-y-2">
                        {links.map(link => (
                          <li key={link}>
                            <Link
                              href="/sign-in"
                              className="text-white/55 hover:text-white text-sm transition-colors"
                            >
                              {link}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-white/30 text-xs">
                  © 2025 WRS Marketplace. All rights reserved.
                </p>
                <p className="text-white/20 text-xs">
                  Regulated agricultural commodity trading platform.
                </p>
              </div>
            </div>
          </footer>

        </div>
      </Show>
    </>
  );
}
