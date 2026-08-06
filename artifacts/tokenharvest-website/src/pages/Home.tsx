import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, X, Send } from "lucide-react";
import { PriceTicker } from "@/components/PriceTicker";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const img = (name: string) => `${BASE}/theme/${name}`;
const photo = (name: string) => `${BASE}/photos/${name}`;

const ACCENT       = "hsl(180 62% 10%)";   // WRS teal (on light bg)
const ACCENT_LIGHT = "hsl(180 50% 42%)";    // WRS teal (on dark bg)

const HP_API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/* ── Homepage CMS defaults (overridden by /api/content/homepage) ── */
type HpHero    = { badge: string; headline: string; subheadline: string; cta1: string; cta2: string; images?: string[] };
type HpService = { icon: string; title: string; sub: string; desc: string };
type HpAbout   = { badge: string; heading: string; body: string; bullets: string[] };
type HpStep    = { num: string; title: string; desc: string };
type HpStat    = { target: number; suffix: string; label: string };
type HpCta     = { heading: string; subheadline: string; cta1: string; cta2: string };
type HpContent = { hero: HpHero; services: HpService[]; about: HpAbout; howItWorks: HpStep[]; stats: HpStat[]; statsBg?: string; cta: HpCta; markets: MarketCardData[] };

const DEF_HERO: HpHero = {
  badge: "WRS Marketplace",
  headline: "Trade.\nFinance.\nDeliver.",
  subheadline: "TokenHarvest enables businesses to trade agricultural commodities with confidence across East Africa and global markets.",
  cta1: "Join the Marketplace",
  cta2: "Our Services",
  images: [photo("hero-soybean-farmer.jpg"), photo("about-planting.jpg"), photo("cta-harvest.jpg")],
};
const DEF_SERVICES: HpService[] = [
  {
    icon: "icon-money-1.png",
    title: "Direct Trade",
    sub: "For Buyers & Producers",
    desc: "Finding reliable suppliers and negotiating fair prices across borders shouldn't take months of guesswork. Connect directly with verified producers, compare offers transparently, and close deals with confidence, backed by digital contracts and full origin traceability.",
  },
  {
    icon: "icon-tax.png",
    title: "Trade Execution",
    sub: "For Buyers",
    desc: "Once a deal is done, moving goods across borders becomes a maze of freight, customs, documentation, and insurance. We handle every step so you receive what you paid for, where and when you need it, without ever having to manage the logistics yourself.",
  },
  {
    icon: "icon-financial-1.png",
    title: "Trade Finance",
    sub: "For Buyers & Suppliers",
    desc: "Capital tied up in inventory or slow payments shouldn't stop a deal from happening. Access working capital against your purchase orders, invoices, or warehouse receipts, and trade at the scale the market demands, not the scale your cash flow allows.",
  },
];

function normalizeServices(value: unknown): HpService[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const mapped = value.map((service, index) => {
    const raw = service && typeof service === "object"
      ? service as Record<string, unknown>
      : {};
    const fallback = DEF_SERVICES[index] ?? DEF_SERVICES[0];

    return {
      icon:  typeof raw["icon"]  === "string" ? raw["icon"]  : fallback.icon,
      title: typeof raw["title"] === "string" ? raw["title"] : fallback.title,
      sub:   typeof raw["sub"]   === "string" ? raw["sub"]   : fallback.sub,
      desc:  typeof raw["desc"]  === "string" ? raw["desc"]  : fallback.desc,
    };
  });

  // Append any new default cards not yet present in the persisted array
  if (mapped.length < DEF_SERVICES.length) {
    return [...mapped, ...DEF_SERVICES.slice(mapped.length)];
  }

  return mapped;
}

function normalizeHero(value: unknown): HpHero {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const images = Array.isArray(raw.images)
    ? raw.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];

  return {
    badge: typeof raw.badge === "string" ? raw.badge : DEF_HERO.badge,
    headline: typeof raw.headline === "string" ? raw.headline : DEF_HERO.headline,
    subheadline: typeof raw.subheadline === "string" ? raw.subheadline : DEF_HERO.subheadline,
    cta1: typeof raw.cta1 === "string" ? raw.cta1 : DEF_HERO.cta1,
    cta2: typeof raw.cta2 === "string" ? raw.cta2 : DEF_HERO.cta2,
    images: images.length > 0 ? images : DEF_HERO.images,
  };
}
const DEF_ABOUT: HpAbout = {
  badge: "The Platform",
  heading: "End-to-End Digital\nTrade Infrastructure",
  body: "TokenHarvest helps you source, finance, move, and manage agricultural trade with confidence. Built for growing businesses, it brings the essential tools for international trade into one platform, helping you reduce complexity, improve visibility, and reach new markets faster.",
  bullets: [
    "Source: Find trusted producers and suppliers across East Africa, matched to your quality, volume, and sourcing requirements.",
    "Trade: Negotiate, contract, and complete transactions with confidence through secure digital trade workflows.",
    "Finance: Access the capital you need to buy, sell, and grow, when you need it, not when traditional financing becomes available.",
    "Fulfil: Move your products from origin to destination with integrated warehousing, shipping, customs, and delivery services.",
    "Insights: Make better trading decisions with real-time market intelligence, portfolio visibility, and performance analytics.",
  ],
};
const DEF_STEPS: HpStep[] = [
  { num: "01", title: "Intake & Grading",    desc: "Commodity arrives at a licensed warehouse. WMS staff grade, weigh, and issue a digital eWR linked to physical stock." },
  { num: "02", title: "List or Auction",     desc: "Producer posts to the spot marketplace, creates a timed auction, or locks in a forward contract with a buyer." },
  { num: "03", title: "Trade Executes",      desc: "Bids clear or orders match. The state machine transitions the eWR through MARKET_LISTED → SOLD automatically." },
  { num: "04", title: "Settlement & Payout", desc: "Platform fee withheld, bank lien cleared, producer receives net proceeds. Full audit trail immutably recorded." },
];
const DEF_STATS: HpStat[] = [
  { target: 20,   suffix: "+", label: "eWRs Issued" },
  { target: 5,    suffix: "",  label: "Commodities" },
  { target: 97,   suffix: "%", label: "Audit Coverage" },
  { target: 1200, suffix: "+", label: "Transactions" },
];
const DEF_CTA: HpCta = {
  heading: "Ready to Trade\nwith Confidence?",
  subheadline: "Join producers, off-takers, and financiers already using WRS Marketplace to trade East African commodities with full transparency.",
  cta1: "Create Your Account",
  cta2: "Sign In",
};
const DEF_MARKETS: MarketCardData[] = [
  { num: "01", name: "Maize",   grade: "Grade A–C",    link: "/grain/",  desc: "White & Yellow varieties with 90-day certified storage, fully backed by registered warehouses.", photo: "https://picsum.photos/seed/maize-field/400/640" },
  { num: "02", name: "Rice",    grade: "Grade A–B",    link: "/grain/",  desc: "Milled & paddy rice from certified storage facilities across East Africa.", photo: "https://picsum.photos/seed/rice-paddy/400/640" },
  { num: "03", name: "Coffee",  grade: "AA / AB / PB", link: "/coffee/", desc: "Washed & natural-process beans, export-ready and auction-listed at the Nairobi Coffee Exchange.", photo: "https://picsum.photos/seed/coffee-beans/400/640" },
  { num: "04", name: "Tea",     grade: "BOPI / FNDC",  link: "/tea/",    desc: "Orthodox & CTC grades, Mombasa auction listed with full provenance traceability.", photo: "https://picsum.photos/seed/tea-plantation/400/640" },
  { num: "05", name: "Avocado", grade: "Hass Export",  link: "/grain/",  desc: "Cold-chain certified Hass avocados meeting EU/UK market phytosanitary standards.", photo: "https://picsum.photos/seed/avocado-farm/400/640" },
  { num: "06", name: "Honey",   grade: "Raw & Pure",   link: "/grain/",  desc: "Traceable East African honey from verified producer networks, ready for regional and export markets.", photo: "https://picsum.photos/seed/honeycomb/400/640" },
];

/* ── smooth scroll helper ─────────────────────────────────── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = 68;
  const extraPad = 24;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - extraPad;
  window.scrollTo({ top, behavior: "smooth" });
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

/* ── Available-Markets photo card ─────────────────────── */
type MarketCardData = { num: string; name: string; grade: string; desc: string; photo: string; link: string };

function MarketCard({ num, name, grade, desc, photo, link }: MarketCardData) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: hover ? "1.8 1 0" : "1 1 0",
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "flex 0.45s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease",
        backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.80) 30%, rgba(0,0,0,${hover ? "0.40" : "0.25"}) 100%), url(${photo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: hover
          ? "0 8px 16px rgba(0,0,0,0.12), 0 24px 48px rgba(0,0,0,0.08), 0 48px 80px rgba(0,0,0,0.04)"
          : "0 2px 4px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "28px 24px",
      }}
    >
      {/* card number */}
      <div style={{
        color: "rgba(255,255,255,0.22)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.12em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {num}
      </div>

      {/* bottom block */}
      <div>
        {/* description + link, only on hover */}
        <div style={{
          overflow: "hidden",
          maxHeight: hover ? 140 : 0,
          opacity: hover ? 1 : 0,
          transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease",
          marginBottom: hover ? 16 : 0,
        }}>
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 12.5,
            lineHeight: 1.75,
            margin: "0 0 14px",
          }}>{desc}</p>
          {link && (
            <a
              href={link}
              style={{
                color: ACCENT_LIGHT,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
               Explore {name} Market <ArrowRight size={13} />
            </a>
          )}
        </div>

        {/* title */}
        <div style={{
          fontSize: "clamp(1rem, 1.4vw, 19px)",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 10,
          lineHeight: 1.2,
          whiteSpace: hover ? "normal" : "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {name}
        </div>

        {/* accent underline */}
        <div style={{ width: 28, height: 2, background: ACCENT_LIGHT, transition: "width 0.35s ease", ...(hover ? { width: 44 } : {}) }} />
      </div>
    </div>
  );
}

function EsgSection() {
  return (
    <section id="esg" style={{ background: "#fff", padding: "96px 0 112px", position: "relative", overflow: "hidden" }}>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", position: "relative", zIndex: 1 }}>

        {/* ─ Top layout: statement left, paragraph right ─ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 80 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Our Commitment
              </span>
            </div>
            <h2 style={{
              fontSize: "clamp(2rem, 3.5vw, 46px)", fontWeight: 300,
              color: "#090909", margin: "0 0 8px", lineHeight: 1.12,
            }}>
              ESG is not<br />
              <strong style={{ fontWeight: 700 }}>a checkbox.</strong>
            </h2>
            <div style={{ width: 40, height: 2, background: ACCENT, marginTop: 24 }} />
          </div>

          <div>
            <p style={{ fontSize: 17, color: "#666", lineHeight: 1.9, margin: 0 }}>
              Agricultural commodity trading sits at the intersection of climate, livelihoods,
              and financial inclusion. We built TokenHarvest around the conviction that a
              transparent, digitised supply chain is inherently a more responsible one, and
              that ESG outcomes should be an unavoidable consequence of doing business
              on the platform, not an afterthought.
            </p>
          </div>
        </div>

        {/* ─ Three pillars ─ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
          {([
            {
              letter: "E",
              label: "Environmental",
              heading: "Smarter Storage. Shorter Supply Chains.",
              body: "Digitising agricultural storage and enabling direct producer-to-buyer trades optimizes commodity transit across East Africa. By routing volumes through certified cooperative networks, TokenHarvest systematically eliminates middle-mile logistics inefficiencies. Moving assets closer to the demand source results in fewer intermediaries, less spoilage, and a measurable reduction in the carbon intensity of the food supply chain.",
            },
            {
              letter: "S",
              label: "Social",
              heading: "Grassroots Financial & Market Inclusion.",
              body: "TokenHarvest connects rural agricultural networks directly to verified buyers and formal financing structures. By broadening market access for aggregated producer communities, the platform drives sustainable livelihood improvements and raises incomes for sectors historically priced out of agri-finance. Every trade facilitated on the platform serves as a scalable step toward regional financial inclusion and economic resilience.",
            },
            {
              letter: "G",
              label: "Governance",
              heading: "Traceable Transaction Lifecycles.",
              body: "Every transaction, whether handling grains, coffee, tea, or perishables, is executed through a secure lifecycle and protected by cryptographic hashing. TokenHarvest provides transaction integrity by integrating data protocols across diverse value chains. The result is a transparent governance architecture that satisfies lending covenants, regulatory requirements, and investor reporting standards without manual reconciliation.",
            },
          ] as const).map(({ letter, label, heading, body }, i) => (
            <div key={label} style={{
              background: "#f7f7f7",
              borderLeft: i === 0 ? "none" : "1px solid #ebebeb",
              padding: "48px 40px 52px",
              display: "flex",
              flexDirection: "column",
              borderRadius: 8,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.03)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.03)";
            }}>
              {/* Large letter watermark */}
              <div style={{
                fontSize: 80, fontWeight: 800, lineHeight: 1,
                color: ACCENT, opacity: 0.12,
                marginBottom: 20, letterSpacing: "-0.04em",
              }}>
                {letter}
              </div>
              <h3 style={{
                fontSize: 11, fontWeight: 700, color: ACCENT,
                letterSpacing: "0.2em", textTransform: "uppercase",
                margin: "0 0 12px",
              }}>
                {label}
              </h3>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.85, textAlign: "left", margin: 0, flex: 1 }}>
                {body}
              </p>
              <h4 style={{
                fontSize: 14, fontWeight: 600, color: "#222",
                margin: "32px 0 0", lineHeight: 1.4,
              }}>
                {heading}
              </h4>
              <div style={{ width: 28, height: 2, background: ACCENT, marginTop: 16 }} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ── Partners data types ───────────────────────────────────── */
type Partner = { id: string; name: string; short: string; logoUrl: string; website: string };

const DEFAULT_PARTNERS: Partner[] = [
  { id: "1", name: "Kenya Cereal Board",         short: "KCB", logoUrl: "", website: "https://kdb.go.ke" },
  { id: "2", name: "East African Community",     short: "EAC", logoUrl: "", website: "https://eac.int" },
  { id: "3", name: "African Development Bank",   short: "ADB", logoUrl: "", website: "https://afdb.org" },
  { id: "4", name: "Equity Bank Kenya",          short: "EBK", logoUrl: "", website: "https://equitybankgroup.com" },
  { id: "5", name: "Kilimo Trust",               short: "KT",  logoUrl: "", website: "https://kilimotrust.org" },
  { id: "6", name: "Kenya National Farmers Fed.",short: "KNF", logoUrl: "", website: "https://kenaff.org" },
  { id: "7", name: "WFP East Africa",            short: "WEA", logoUrl: "", website: "https://wfp.org" },
  { id: "8", name: "USAID AgriLinks",            short: "UA",  logoUrl: "", website: "https://agrilinks.org" },
];

function PartnerLogo({ partner }: { partner: Partner }) {
  const [broken, setBroken] = useState(false);
  const card = (
    <div style={{
      width: 100, height: 48,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f0f0f0", borderRadius: 6,
      fontSize: 13, fontWeight: 700, color: "#aaa", letterSpacing: "0.1em",
    }}>
      {partner.short}
    </div>
  );

  return partner.website ? (
    <a href={partner.website} target="_blank" rel="noopener noreferrer"
      title={partner.name}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none",
               transition: "opacity 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      {card}
      <span style={{ fontSize: 10, color: "#999", fontWeight: 500, letterSpacing: "0.06em",
                     textAlign: "center", maxWidth: 100 }}>{partner.name}</span>
    </a>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {card}
      <span style={{ fontSize: 10, color: "#999", fontWeight: 500, letterSpacing: "0.06em",
                     textAlign: "center", maxWidth: 100 }}>{partner.name}</span>
    </div>
  );
}

function PartnersSection() {
  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS);
  const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  useEffect(() => {
    fetch(`${API}/api/content/partners`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value?.partners?.length) setPartners(data.value.partners); })
      .catch(() => {});
  }, [API]);

  return (
    <section style={{ background: "#fff", borderTop: "1px solid #f0f0f0", padding: "96px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header, corzo style */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
            <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Trusted Partners
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#090909", margin: "0 0 16px", lineHeight: 1.15 }}>
            Working alongside East Africa's leading institutions
          </h2>
          <div style={{ width: 40, height: 2, background: ACCENT, margin: "0 auto" }} />
        </div>

        {/* Logo grid */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          alignItems: "center", gap: "32px 48px",
        }}>
          {partners.filter(p => p.name).map(p => (
            <PartnerLogo key={p.id} partner={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Contact Modal ─────────────────────────────────────── */
function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  useEffect(() => {
    if (!open) { setForm({ name: "", email: "", message: "" }); setStatus("idle"); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Send failed");
      setStatus("done");
    } catch {
      setStatus("idle");
      alert("Something went wrong. Please try again.");
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#111", width: "100%", maxWidth: 480,
          padding: "48px 40px 40px",
          position: "relative",
          fontFamily: "'Futura', sans-serif",
        }}
      >
        {/* close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 18, right: 18,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.35)", padding: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} />
        </button>

        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Send size={20} color="#fff" />
            </div>
            <h3 style={{ color: "#fff", fontWeight: 300, fontSize: 22, margin: "0 0 10px" }}>Message sent</h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, margin: "0 0 28px" }}>
              We'll be in touch shortly.
            </p>
            <button onClick={onClose} style={{
              background: ACCENT, color: "#fff", border: "none", cursor: "pointer",
              padding: "13px 28px", fontSize: 14, fontWeight: 600, fontFamily: "'Futura',sans-serif",
            }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              <div style={{ width: 3, height: 22, background: ACCENT }} />
              <h3 style={{ color: "#fff", fontWeight: 300, fontSize: 22, margin: 0 }}>Get in touch</h3>
            </div>

            <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { key: "name",    label: "Full name",     type: "text",  placeholder: "Your name" },
                { key: "email",   label: "Email address", type: "email", placeholder: "you@company.com" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                    {label}
                  </label>
                  <input
                    required type={type} placeholder={placeholder}
                    value={form[key as "name" | "email"]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{
                      width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "'Futura',sans-serif",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                  Message
                </label>
                <textarea
                  required rows={4} placeholder="How can we help you?"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={{
                    width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "'Futura',sans-serif",
                    outline: "none", resize: "vertical", boxSizing: "border-box",
                  }}
                />
              </div>
              <button type="submit" disabled={status === "sending"} style={{
                background: ACCENT, color: "#fff", border: "none", cursor: status === "sending" ? "default" : "pointer",
                padding: "15px 28px", fontSize: 15, fontWeight: 600, fontFamily: "'Futura',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: status === "sending" ? 0.7 : 1, marginTop: 4,
              }}>
                {status === "sending" ? "Sending…" : <><Send size={15} /> Send Message</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [statsOn, setStatsOn]   = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const [hp, setHp] = useState<Partial<HpContent>>({});
  const [activePillar, setActivePillar] = useState<number | null>(null);
  const hero     = hp.hero        ?? DEF_HERO;
  const heroImages = (hero.images?.filter(Boolean).length ? hero.images : DEF_HERO.images) ?? [];
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const services = hp.services    ?? DEF_SERVICES;
  const about    = hp.about       ?? DEF_ABOUT;
  const steps    = hp.howItWorks  ?? DEF_STEPS;
  const hpStats  = hp.stats       ?? DEF_STATS;
  const statsBg  = hp.statsBg?.trim() || img("bg-counter.jpg");
  const cta      = hp.cta         ?? DEF_CTA;
  const markets  = hp.markets     ?? DEF_MARKETS;

  useEffect(() => {
    fetch(`${HP_API}/api/content/homepage`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.value || typeof d.value !== "object") return;
        setHp({
          ...d.value,
          hero: normalizeHero(d.value.hero),
          services: normalizeServices(d.value.services) ?? DEF_SERVICES,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setHeroImageIndex(0);
  }, [heroImages.join("|")]);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const timer = window.setInterval(() => {
      setHeroImageIndex(current => (current + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroImages.join("|")]);

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
      <div style={{ fontFamily: "'Futura', sans-serif", color: "#353535" }}>

          {/* ══ NAVBAR ══════════════════════════════════════════════ */}
          <header className="homepage-header" style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
            background: scrolled ? "rgba(22,22,22,0.97)" : "transparent",
            backdropFilter: scrolled ? "blur(10px)" : "none",
            transition: "background 0.3s",
          }}>
            {/* thin top bar */}
            <div className="homepage-topbar" style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
              <div className="homepage-main-nav" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* logo */}
              <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                <span
                  className="homepage-logo tokenharvest-wordmark"
                  style={{ color: "#fff", fontSize: 42, marginLeft: -14 }}
                >
                  TokenHarvest
                </span>
              </Link>
              {/* numbered links */}
              <nav className="homepage-nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
                {([ ["01","Platform","platform"], ["02","Services","services"], ["03","About","about"], ["04","Contact","cta"] ] as const).map(([n, label, id]) => (
                  <button key={n} onClick={() => scrollTo(id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: 500, display: "flex", gap: 5, alignItems: "center", fontFamily: "'Futura',sans-serif", padding: 0 }}>
                    <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600 }}>{n}</span>{label}
                  </button>
                ))}
              </nav>
              {/* auth buttons */}
              <div className="homepage-auth-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {isSignedIn ? (
                  <Link href="/dashboard"
                    style={{ background: ACCENT, color: "#fff", padding: "10px 22px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                    Go to Dashboard <ArrowRight size={15} />
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                      Sign In
                    </Link>
                    <Link href="/sign-up"
                      style={{ background: ACCENT, color: "#fff", padding: "10px 22px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                      Get Started <ArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* ══ HERO ════════════════════════════════════════════════ */}
          <section className="homepage-hero" style={{ position: "relative", height: "100vh", minHeight: 600, display: "flex", alignItems: "center" }}>
            {/* left charcoal panel */}
            <div className="homepage-hero-panel" style={{ position: "absolute", inset: 0, right: "48%", background: "#161616", zIndex: 1 }} />
            {/* right panel, rotating hero image gallery */}
            <div className="homepage-hero-photo" style={{ position: "absolute", inset: 0, left: "52%", zIndex: 1, overflow: "hidden", background: "#163333" }}>
              {heroImages.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  aria-hidden={index !== heroImageIndex}
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: index === heroImageIndex ? 1 : 0,
                    transform: index === heroImageIndex ? "scale(1.03)" : "scale(1)",
                    transition: "opacity 1.35s ease-in-out, transform 6.5s ease-out",
                  }}
                />
              ))}
            </div>
            {/* WRS brand green overlay over the photo for cohesion + legibility */}
            <div className="homepage-hero-overlay" style={{
              position: "absolute", inset: 0, left: "52%", zIndex: 1,
              background: "linear-gradient(145deg, hsl(180 62% 10% / 0.36) 0%, hsl(180 62% 6% / 0.44) 60%, hsl(180 50% 8% / 0.36) 100%)",
            }} />
            {/* subtle dot-grid pattern overlay */}
            <div className="homepage-hero-grid" style={{
              position: "absolute", inset: 0, left: "52%", zIndex: 2,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }} />

            {/* hero content (left side) */}
            <div className="homepage-hero-content" style={{ position: "relative", zIndex: 3, width: "52%", padding: "0 48px 0 max(32px, calc((100vw - 1200px) / 2 + 32px))" }}>
              <div className="homepage-hero-inner" style={{ maxWidth: 520 }}>
                {/* brand label */}
                <div className="homepage-hero-badge" style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 48, marginBottom: 18 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase" }}>{hero.badge}</span>
                </div>
                {/* heading */}
                <h1 className="homepage-hero-heading" style={{ color: "#fff", fontWeight: 300, lineHeight: 1.06, margin: "0 0 30px", fontSize: "clamp(4rem, 8.5vw, 7.5rem)", whiteSpace: "pre-line", letterSpacing: "-0.035em" }}>
                  {hero.headline.replace(/^Trade\.\s+Finance\.\s*[\r\n]+?Deliver\.$/, "Trade.\nFinance.\nDeliver.")}
                </h1>
                {/* accent line */}
                <div style={{ width: 56, height: 2, background: ACCENT, marginBottom: 26 }} />
                {/* sub */}
                <p className="homepage-hero-subheadline" style={{ color: "rgba(255,255,255,0.55)", fontSize: 18, fontWeight: 300, lineHeight: 1.65, margin: "0 0 38px", maxWidth: 560 }}>
                  {hero.subheadline}
                </p>
                {/* CTAs */}
                <div className="homepage-hero-actions" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Link href="/sign-up"
                    style={{ background: ACCENT, color: "#fff", padding: "16px 28px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {hero.cta1} <ArrowRight size={16} />
                  </Link>
                  <button onClick={() => scrollTo("services")}
                    style={{ background: "#323232", color: "#fff", padding: "16px 28px", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, fontFamily: "'Futura',sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {hero.cta2} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ══ SERVICE CARDS ════════════════════════════════════════
              White panel overlapping hero by −72px, 3 columns
              Exact Corzo: icon → red-dot title → text → divider
          ════════════════════════════════════════════════════════ */}
          <section id="services" style={{ background: "#f5f5f5", paddingTop: 80, paddingBottom: 80 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              {/* Section title */}
              <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Our Services</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#232323", margin: 0 }}>
                  Trading Solutions
                </h2>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                background: "#fff", position: "relative", zIndex: 10,
                boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
              }}>
                {services.map(({ icon, title, sub, desc }, i) => (
                  <div key={title} style={{
                    padding: "64px 40px 52px",
                    borderRight: i % 3 !== 2 && i !== services.length - 1 ? "1px solid #f0f0f0" : undefined,
                    borderTop: i >= 3 ? "1px solid #f0f0f0" : undefined,
                    transition: "box-shadow 0.3s ease, transform 0.3s ease",
                    boxShadow: "inset 0 0 0 transparent",
                    position: "relative",
                    zIndex: 1,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px) scale(1.02)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.08)";
                    (e.currentTarget as HTMLDivElement).style.zIndex = "10";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "inset 0 0 0 transparent";
                    (e.currentTarget as HTMLDivElement).style.zIndex = "1";
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
          <section id="about" style={{ background: "#e8e8e8", padding: "104px 0 112px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={photo("about-planting.jpg")} alt="East African farmer planting in the field" style={{ width: "94%", display: "block", objectFit: "cover", aspectRatio: "4 / 3", maxHeight: 460, boxShadow: "0 8px 20px rgba(0,0,0,0.35), 0 24px 60px rgba(0,0,0,0.25), 0 48px 100px rgba(0,0,0,0.15)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>{about.badge}</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#090909", lineHeight: 1.18, margin: "0 0 24px", whiteSpace: "pre-line" }}>
                  {about.heading}
                </h2>
                <p style={{ fontSize: 16, color: "#555", lineHeight: 1.85, marginBottom: 36 }}>
                  {about.body}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
                  {about.bullets.map((item, idx) => {
                    const colonIdx = item.indexOf(": ");
                    const title = colonIdx >= 0 ? item.slice(0, colonIdx) : item;
                    const desc  = colonIdx >= 0 ? item.slice(colonIdx + 2) : "";
                    const active = activePillar === idx;
                    return (
                      <li key={item}
                        onMouseEnter={() => setActivePillar(idx)}
                        onMouseLeave={() => setActivePillar(null)}
                        style={{ borderBottom: "1px solid #d0d0d0", padding: "14px 0", cursor: "default" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <ChevronRight size={14} style={{ color: ACCENT, flexShrink: 0, transition: "transform 0.2s", transform: active ? "rotate(90deg)" : "none" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: active ? ACCENT : "#232323", transition: "color 0.2s" }}>{title}</span>
                        </div>
                        <div style={{ overflow: "hidden", maxHeight: active ? 80 : 0, opacity: active ? 1 : 0, transition: "max-height 0.3s ease, opacity 0.25s ease", paddingLeft: 23 }}>
                          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "9px 0 2px" }}>{desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},1fr)`, gap: 0 }}>
                {steps.map(({ num, title, desc }, i) => (
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
            backgroundImage: `url(${statsBg})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,12,0.82)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${hpStats.length},1fr)`, gap: 40, textAlign: "center" }}>
                {hpStats.map(({ target, suffix, label }) => (
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

          {/* ══ AVAILABLE MARKETS ────────────────────────────────── */}
          <section style={{ background: "#fff" }}>

            {/* Section header, centred and constrained */}
            <div style={{ textAlign: "center", padding: "96px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Traded Commodities</span>
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 400, color: "#1a1a1a", margin: 0 }}>
                Available Markets
              </h2>
            </div>

            {/* Full-bleed photo card strip */}
            <div style={{ display: "flex", height: 500 }}>
              {markets.map(card => <MarketCard key={card.num} {...card} />)}
            </div>

          </section>

          {/* ══ ESG ──────────────────────────────────────────────── */}
          <EsgSection />

          {/* ══ TRADE FINANCE & LIQUIDITY ════════════════════════ */}
          <section style={{ background: "#f7f7f7", padding: "96px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Trade Finance &amp; Settlement</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3.2vw, 40px)", fontWeight: 500, color: "#090909", margin: "0 0 16px", lineHeight: 1.15 }}>
                  Trade Finance &amp; Settlement
                </h2>
                <div style={{ width: 40, height: 2, background: ACCENT, marginBottom: 24 }} />
                <p style={{ color: "#555", fontSize: 16, fontWeight: 300, lineHeight: 1.8, margin: "0 0 28px" }}>
                  <strong style={{ fontWeight: 500, color: "#1a1a1a" }}>Empower your business with seamless financing, secure payments, and efficient settlement throughout the trade lifecycle.</strong>
                </p>
                <p style={{ color: "#555", fontSize: 16, fontWeight: 300, lineHeight: 1.8, margin: 0 }}>
                  TokenHarvest streamlines the financial side of trade by connecting buyers, suppliers, financial institutions, insurers, and payment providers through a unified digital ecosystem. From securing working capital and trade finance to processing cross-border payments and final settlement, the platform helps businesses trade with greater confidence, speed, and transparency.
                </p>
              </div>
              <div>
                <div style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.04), 0 24px 48px rgba(0,0,0,0.03)",
                  padding: 48,
                  textAlign: "center",
                  border: "1px solid #ececec",
                }}>
                  <div style={{ fontSize: 48, fontWeight: 200, color: ACCENT, lineHeight: 1, marginBottom: 12 }}>
                    75%
                  </div>
                  <div style={{ color: "#666", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 32 }}>
                    LTV on Stored Inventory
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, textAlign: "left" }}>
                    {([
                      { label: "Loan Amount", value: "$150,000" },
                      { label: "Interest Rate", value: "9.5% APR" },
                      { label: "Tenure", value: "6 Months" },
                      { label: "Collateral", value: "500 MT Maize" },
                    ]).map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ color: "#999", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                        <div style={{ color: "#1a1a1a", fontSize: 16, fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══ PARTNERS ─────────────────────────────────────────── */}
          <PartnersSection />

          {/* ══ CTA ─────────────────────────────────────────────── */}
           <section id="cta" style={{
             position: "relative", padding: "40px 0 72px",
            backgroundImage: `url(${photo("cta-harvest.jpg")})`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(8,8,8,0.85)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Get Started</span>
              </div>
               <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 48px)", fontWeight: 300, color: "#fff", lineHeight: 1.12, margin: "0 0 22px", whiteSpace: "pre-line", letterSpacing: "-0.025em" }}>
                {cta.heading}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, fontWeight: 300, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.8 }}>
                {cta.subheadline}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                <Link href="/sign-up"
                  style={{ background: ACCENT, color: "#fff", padding: "17px 32px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {cta.cta1} <ArrowRight size={16} />
                </Link>
                <button onClick={() => setContactOpen(true)}
                  style={{ background: "#2a2a2a", color: "#fff", padding: "17px 32px", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, fontFamily: "'Futura',sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Contact Us
                </button>
              </div>
            </div>
          </section>

          {/* ══ FOOTER ──────────────────────────────────────────── */}
          <footer style={{ background: "#0d0d0d", padding: "64px 0 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, paddingBottom: 52, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <Link href="/" style={{ display: "inline-flex" }}>
                      <span
                        className="tokenharvest-wordmark"
                        style={{ color: "#fff", fontSize: 30 }}
                      >
                        TokenHarvest
                      </span>
                    </Link>
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
                            ? <button onClick={() => scrollTo(href.slice(1))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "'Futura',sans-serif", padding: 0 }}>{name}</button>
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

        {/* ══ CONTACT MODAL ═══════════════════════════════════════ */}
        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
