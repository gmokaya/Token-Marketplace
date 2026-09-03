import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, X, Send, Menu, Linkedin, Instagram, Facebook } from "lucide-react";
import { PriceTicker } from "@/components/PriceTicker";
import { TokenHarvestHero } from "@/components/home/TokenHarvestHero";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const img = (name: string) => `${BASE}/theme/${name}`;
const photo = (name: string) => `${BASE}/photos/${name}`;
const marketPhoto = (name: string) => `${BASE}/markets/${name}`;

const ACCENT       = "hsl(180 62% 10%)";   // WRS teal (on light bg)
const ACCENT_LIGHT = "hsl(180 50% 42%)";    // WRS teal (on dark bg)

const HP_API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/* ── Homepage CMS defaults (overridden by /api/content/homepage) ── */
type HpHero    = { badge: string; headline: string; subheadline: string; cta1: string; cta2: string; images?: string[] };
type HpService = { icon: string; title: string; sub: string; desc: string };
type HpAbout   = { badge: string; heading: string; body: string; bullets: string[] };
type HpStep    = { num: string; title: string; subtitle: string; tagline: string; desc: string };
type HpStat    = { target: number; suffix: string; label: string };
type HpCta     = { heading: string; subheadline: string; cta1: string; cta2: string };
type HpContent = { hero: HpHero; services: HpService[]; about: HpAbout; howItWorks: HpStep[]; stats: HpStat[]; statsBg?: string; cta: HpCta; markets: MarketCardData[] };

const DEF_HERO: HpHero = {
  badge: "TokenHarvest Commodities",
  headline: "Origin,\ntraded\nforward.",
  subheadline: "Specialty quality with trade finance built into every move.",
  cta1: "Join the Marketplace",
  cta2: "Our Services",
  images: [photo("hero-soybean-farmer.jpg"), photo("about-planting.jpg"), photo("cta-harvest.jpg")],
};
const DEF_SERVICES: HpService[] = [
  {
    icon: "icon-money-1.png",
    title: "Direct Trade",
    sub: "Farmer First",
    desc: "Trade directly with verified producers, clear offers, and lot-level traceability.",
  },
  {
    icon: "icon-tax.png",
    title: "Trade Execution",
    sub: "For Buyers",
    desc: "Coordinate freight, customs, and delivery from origin to destination.",
  },
  {
    icon: "icon-financial-1.png",
    title: "Trade Finance",
    sub: "For Buyers & Suppliers",
    desc: "Unlock working capital against inventory, orders, invoices, and receipts.",
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
  badge: "Commodity Trade, Resolved",
  heading: "From origin lot\nto delivered contract.",
  body: "TokenHarvest turns fragmented origin supply into contract-ready commodity flows. We aggregate verified producers, standardize lot data against buyer specifications, finance eligible inventory, and coordinate documents and delivery through one auditable trade record.",
  bullets: [
    "SOURCE THE LOT: Aggregate verified origin supply by commodity, crop year, volume, location, and target buyer specification.",
    "GRADE TO SPEC: Capture moisture, screen size, cup profile, defects, weight, certificates, and chain-of-custody data before contracting.",
    "CONTRACT & FINANCE: Match qualified lots to off-takers, agree clear trade terms, and unlock working capital against purchase orders, invoices, or warehouse receipts.",
    "MOVE & SETTLE: Coordinate storage, phytosanitary and customs documents, Incoterms, freight, delivery, and settlement from origin to destination.",
    "TRACE EVERY HANDOFF: Maintain lot-level provenance and an audit-ready record for compliance, claims, and buyer reporting.",
  ],
};
const DEF_STEPS: HpStep[] = [
  {
    num: "01",
    title: "Source",
    subtitle: "Farmer First",
    tagline: "Buy direct from farmers.",
    desc: "Connect with verified farmers and buyers, with every trade traceable to its origin.",
  },
  {
    num: "02",
    title: "Grade",
    subtitle: "Specialty Grade",
    tagline: "Quality you can trust.",
    desc: "Every lot is graded, weighed, and certified before it is listed for trade.",
  },
  {
    num: "03",
    title: "Finance",
    subtitle: "Payments & Financing",
    tagline: "Pay on your terms.",
    desc: "Use escrow, wallet visibility, and built-in financing to manage every payment with confidence.",
  },
  {
    num: "04",
    title: "Deliver",
    subtitle: "Logistics & Documentation",
    tagline: "Logistics handled for you.",
    desc: "We handle delivery, documentation, and customs so you can focus on sourcing confidently.",
  },
];

function normalizeSteps(value: unknown): HpStep[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  return value.map((step, index) => {
    const raw = step && typeof step === "object"
      ? step as Record<string, unknown>
      : {};
    const fallback = DEF_STEPS[index] ?? DEF_STEPS[0];

    return {
      num: typeof raw["num"] === "string" ? raw["num"] : fallback.num,
      title: typeof raw["title"] === "string" ? raw["title"] : fallback.title,
      subtitle: typeof raw["subtitle"] === "string" ? raw["subtitle"] : fallback.subtitle,
      tagline: typeof raw["tagline"] === "string" ? raw["tagline"] : fallback.tagline,
      desc: typeof raw["desc"] === "string" ? raw["desc"] : fallback.desc,
    };
  });
}
const DEF_STATS: HpStat[] = [
  { target: 5,  suffix: "",    label: "East African Countries" },
  { target: 25, suffix: "%",   label: "Increased Farmer Earnings" },
  { target: 24, suffix: " hrs", label: "Trade & Settlement Time" },
  { target: 15, suffix: "+",   label: "Established Destination Markets" },
];
const DEF_CTA: HpCta = {
  heading: "Ready to Trade\nwith Confidence?",
  subheadline: "Join producers, off-takers, and financiers already using WRS Marketplace to trade East African commodities with full transparency.",
  cta1: "Get Started",
  cta2: "Sign In",
};
const DEF_MARKETS: MarketCardData[] = [
  { num: "01", name: "Grain",   grade: "Grade A–C",    link: "/grain/",  desc: "Trade dependable East African grains with verified quality, certified storage, and transparent delivery from origin to market.", photo: marketPhoto("grain-corn.png") },
  { num: "02", name: "Nuts",    grade: "Grade A–B",    link: "/grain/",  desc: "Source premium East African nuts with trusted grading, secure storage, and the traceability discerning buyers expect.", photo: marketPhoto("nuts-chickpeas.jpg") },
  { num: "03", name: "Coffee",  grade: "AA / AB / PB", link: "/coffee/", desc: "Discover speciality East African coffees with distinctive origins, careful processing, and export-ready lots for buyers who value every note.", photo: marketPhoto("parchment-coffee.jpg") },
  { num: "04", name: "Tea",     grade: "BOPI / FNDC",  link: "/tea/",    desc: "Explore speciality teas from East Africa, from bright orthodox leaves to expressive specialty lots, with provenance from garden to cup.", photo: marketPhoto("tea-speciality-leaves.jpg") },
  { num: "05", name: "Avocado", grade: "Hass Export",  link: "/grain/",  desc: "Bring export-grade Hass avocados to market with cold-chain confidence, consistent quality, and traceability through every handoff.", photo: marketPhoto("avocado.jpg") },
  { num: "06", name: "Honey",   grade: "Raw & Pure",   link: "/grain/",  desc: "Source golden East African honey from trusted producer networks, raw, pure, and ready for premium regional and export markets.", photo: marketPhoto("honeycomb.jpg") },
];

const MARKET_DESTINATIONS: Record<string, Pick<MarketCardData, "link" | "photo">> = {
  maize: { link: "/grain/", photo: marketPhoto("grain-corn.png") },
  rice: { link: "/grain/", photo: marketPhoto("grain-corn.png") },
  grain: { link: "/grain/", photo: marketPhoto("grain-corn.png") },
  nuts: { link: "/grain/", photo: marketPhoto("nuts-chickpeas.jpg") },
  coffee: { link: "/coffee/", photo: marketPhoto("parchment-coffee.jpg") },
  tea: { link: "/tea/", photo: marketPhoto("tea-speciality-leaves.jpg") },
  avocado: { link: "/grain/", photo: marketPhoto("avocado.jpg") },
  honey: { link: "/grain/", photo: marketPhoto("honeycomb.jpg") },
};

function displayMarketName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "maize") return "Grain";
  if (normalized === "rice") return "Nuts";
  return name;
}

function normalizeMarkets(value: unknown): MarketCardData[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  return value.map((market, index) => {
    const raw = market && typeof market === "object"
      ? market as Record<string, unknown>
      : {};
    const fallback = DEF_MARKETS[index] ?? DEF_MARKETS[0];
    const sourceName = typeof raw.name === "string" && raw.name.trim()
      ? raw.name
      : fallback.name;
    const name = displayMarketName(sourceName);
    const canonical = MARKET_DESTINATIONS[sourceName.trim().toLowerCase()]
      ?? MARKET_DESTINATIONS[name.trim().toLowerCase()];

    return {
      num: typeof raw.num === "string" ? raw.num : fallback.num,
      name,
      grade: typeof raw.grade === "string" ? raw.grade : fallback.grade,
      desc: typeof raw.desc === "string" ? raw.desc : fallback.desc,
      link: canonical?.link ?? (typeof raw.link === "string" ? raw.link : fallback.link),
      photo: canonical?.photo ?? (typeof raw.photo === "string" ? raw.photo : fallback.photo),
    };
  });
}

/* ── smooth scroll helper ─────────────────────────────────── */
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = document.querySelector<HTMLElement>(".homepage-header");
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - headerBottom - 24);
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  window.scrollTo({ top, behavior });
}

function scrollHomeToTop(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  window.scrollTo({ top: 0, behavior });
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
         backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.82) 18%, rgba(8,18,17,${hover ? "0.48" : "0.58"}) 100%), url(${photo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
         borderRadius: 0,
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
        <div className="homepage-esg-header" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 80 }}>
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
        <div className="homepage-esg-pillars" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
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
              borderRadius: 6,
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

/* ── Trade Finance Cards ───────────────────────────────────── */
const FINANCE_PRODUCTS = [
  {
    eyebrow: "Harvest Fund",
    audience: "FOR PRODUCERS",
    tone: "red",
    hook: "Fund the Harvest Before It's Sold",
    body: "Inputs, labor, and logistics shouldn't wait on a sale to clear. Access capital ahead of export so the next cycle starts on time.",
    proof: "Funds released before shipment, not after",
    eligibility: "Available once a forward contract or export order is confirmed.",
    cta: "Explore Harvest Fund",
  },
  {
    eyebrow: "Fast Pay",
    audience: "FOR TRADERS",
    tone: "yellow",
    hook: "Get Paid Before the Buyer Settles",
    body: "Waiting on payment terms shouldn't limit how many deals you can run. Convert a confirmed sale into cash and keep trading without the lag.",
    proof: "Access cash as soon as a trade is confirmed",
    eligibility: "Available on any buyer-approved sale on the marketplace.",
    cta: "Explore Fast Pay",
  },
  {
    eyebrow: "Order Finance",
    audience: "FOR BUYERS",
    tone: "blue",
    hook: "Commit to Bigger Orders Without Tying Up Cash",
    body: "A good deal shouldn't be capped by what's sitting in your account today. Finance part of a confirmed order and let the trade fund itself.",
    proof: "Finance a share of the order value upfront",
    eligibility: "Available once a purchase order is matched and confirmed.",
    cta: "Explore Order Finance",
  },
] as const;

function FinanceCard({
  eyebrow, audience, tone, hook, body, proof, eligibility, cta
}: {
  eyebrow: string; audience: string; tone: "red" | "yellow" | "blue"; hook: string; body: string; proof: string; eligibility: string; cta: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="homepage-finance-card"
      data-tone={tone}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ color: "var(--finance-ink)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {eyebrow}
        </div>
        <div style={{ background: "rgba(255,255,255,0.9)", color: "var(--finance-surface)", fontSize: 10, fontWeight: 800, padding: "5px 9px", borderRadius: 3, letterSpacing: "0.06em" }}>
          {audience}
        </div>
      </div>

      <h3 style={{ fontSize: 22, fontWeight: 600, color: "var(--finance-ink)", lineHeight: 1.25, margin: "0 0 16px" }}>
        {hook}
      </h3>

      <p style={{ fontSize: 15, color: "var(--finance-muted)", lineHeight: 1.6, margin: "0 0 24px", flex: 1 }}>
        {body}
      </p>

      <div style={{ background: "rgba(255,255,255,0.92)", borderLeft: "4px solid var(--finance-surface)", padding: "16px 20px", marginBottom: 24, borderRadius: "0 5px 5px 0" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#162d27", marginBottom: 6 }}>
          {proof}
        </div>
        <div style={{ fontSize: 13, color: "rgba(22,45,39,0.68)", fontStyle: "italic", lineHeight: 1.4 }}>
          {eligibility}
        </div>
      </div>

      <Link href="/get-started" style={{
        display: "flex", alignItems: "center", gap: 6,
        color: "var(--finance-ink)",
        fontSize: 14, fontWeight: 600,
        transition: "color 0.2s",
        textDecoration: "none",
      }}>
        {cta} <ArrowRight className="homepage-finance-card-cta-icon" size={14} />
      </Link>
    </div>
  );
}

function FinanceCarousel() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % FINANCE_PRODUCTS.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const move = (direction: number) => {
    setActiveIndex(index => (index + direction + FINANCE_PRODUCTS.length) % FINANCE_PRODUCTS.length);
  };

  return (
    <div
      className="homepage-finance-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="homepage-finance-stage" aria-live="polite">
        {FINANCE_PRODUCTS.map((product, index) => {
          let position = index - activeIndex;
          if (position > 1) position -= FINANCE_PRODUCTS.length;
          if (position < -1) position += FINANCE_PRODUCTS.length;

          return (
            <div
              key={product.eyebrow}
              className="homepage-finance-slide"
              data-position={position}
              aria-hidden={position !== 0}
            >
              <FinanceCard {...product} />
            </div>
          );
        })}
      </div>

      <div className="homepage-finance-controls">
        <button type="button" aria-label="Previous financing offering" onClick={() => move(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div className="homepage-finance-dots" role="tablist" aria-label="Financing offerings">
          {FINANCE_PRODUCTS.map((product, index) => (
            <button
              key={product.eyebrow}
              type="button"
              role="tab"
              aria-label={`Show ${product.eyebrow}`}
              aria-selected={activeIndex === index}
              className={activeIndex === index ? "active" : ""}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <button type="button" aria-label="Next financing offering" onClick={() => move(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Partners data types ───────────────────────────────────── */
type Partner = { id: string; name: string; short: string; logoUrl: string; website: string };

function PartnerLogo({ partner }: { partner: Partner }) {
  const [broken, setBroken] = useState(false);
  if (!partner.logoUrl || broken) return null;

  const card = (
    <img
      src={partner.logoUrl}
      alt={partner.name}
      onError={() => setBroken(true)}
      style={{ maxWidth: 140, maxHeight: 52, objectFit: "contain" }}
    />
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
  const [partners, setPartners] = useState<Partner[]>([]);
  const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  useEffect(() => {
    fetch(`${API}/api/content/partners`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const cmsPartners = data?.value?.partners?.filter((partner: Partner) => partner.name && partner.logoUrl) ?? [];
        setPartners(cmsPartners);
      })
      .catch(() => {});
  }, [API]);

  if (!partners.length) return null;

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
          {partners.map(p => (
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
          fontFamily: "'PT Sans', sans-serif",
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
              padding: "13px 28px", fontSize: 14, fontWeight: 600, fontFamily: "'PT Sans',sans-serif",
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
                      color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "'PT Sans',sans-serif",
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
                    color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "'PT Sans',sans-serif",
                    outline: "none", resize: "vertical", boxSizing: "border-box",
                  }}
                />
              </div>
              <button type="submit" disabled={status === "sending"} style={{
                background: ACCENT, color: "#fff", border: "none", cursor: status === "sending" ? "default" : "pointer",
                padding: "15px 28px", fontSize: 15, fontWeight: 600, fontFamily: "'PT Sans',sans-serif",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [hp, setHp] = useState<Partial<HpContent>>({});
  const [activePillar, setActivePillar] = useState<number | null>(null);
  const hero     = hp.hero        ?? DEF_HERO;
  const services = hp.services    ?? DEF_SERVICES;
  const about    = hp.about       ?? DEF_ABOUT;
  const steps    = hp.howItWorks  ?? DEF_STEPS;
  const hpStats  = hp.stats       ?? DEF_STATS;
  const statsBg  = hp.statsBg?.trim() || photo("stats-containers.jpg");
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
          howItWorks: normalizeSteps(d.value.howItWorks) ?? DEF_STEPS,
          markets: normalizeMarkets(d.value.markets) ?? DEF_MARKETS,
        });
      })
      .catch(() => {});
  }, []);

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
      <div style={{ fontFamily: "'PT Sans', sans-serif", color: "#353535" }}>

          {/* ══ NAVBAR ══════════════════════════════════════════════ */}
          <header className="homepage-header" style={{
            position: "fixed", top: 30, left: 0, right: 0, zIndex: 200,
            background: scrolled ? "rgba(247,245,237,0.97)" : "transparent",
            backdropFilter: scrolled ? "blur(10px)" : "none",
            transition: "background 0.3s",
          }}>
            {/* main nav */}
              <div className="homepage-main-nav" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* logo */}
                  <Link href="/" onClick={scrollHomeToTop} title="Home" className="homepage-logo-link" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                <span
                  className="homepage-logo tokenharvest-wordmark"
                  style={{ color: "#0b3032", fontSize: 42, marginLeft: -14 }}
                >
                  TokenHarvest
                </span>
              </Link>
              {/* primary links */}
              <nav className="homepage-nav-links" style={{ display: "flex", flex: 1, justifyContent: "center", gap: 36, alignItems: "center" }}>
                {([ ["Platform","platform"], ["Services","services"], ["Finance","finance"], ["About","about"] ] as const).map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(11,48,50,0.9)", fontSize: 16, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", fontFamily: "'PT Sans',sans-serif", padding: 0 }}>
                    {label}
                  </button>
                ))}
              </nav>
              <nav className="homepage-utility-links" aria-label="Utility navigation">
                <Link href="/investors">Investors</Link>
                <a href="/api-docs">API Docs</a>
                <button type="button" onClick={() => scrollTo("cta")}>Contact</button>
              </nav>
              {/* auth buttons */}
              <div className="homepage-auth-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {isSignedIn ? (
                  <Link href="/dashboard"
                    style={{ background: ACCENT, color: "#fff", padding: "10px 22px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                    Go to Dashboard <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link href="/get-started"
                    style={{ background: "#d93839", color: "#fff", padding: "10px 22px", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                    Get Started <ArrowRight size={15} />
                  </Link>
                )}
              </div>
              {/* Hamburger - hidden on desktop via CSS, shown on mobile */}
              <button
                className="homepage-hamburger"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#0b3032", padding: "8px", display: "flex", alignItems: "center" }}
              >
                <Menu size={24} />
              </button>
            </div>
          </header>

          {/* ══ MOBILE NAV MENU ═════════════════════════════════════ */}
          {mobileMenuOpen && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(16,16,16,0.98)",
              backdropFilter: "blur(12px)",
              display: "flex", flexDirection: "column",
              padding: "20px 24px 40px",
               fontFamily: "'PT Sans', sans-serif",
              overflowY: "auto",
            }}>
              {/* top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
                  <Link href="/" onClick={(event) => { setMobileMenuOpen(false); scrollHomeToTop(event); }} style={{ textDecoration: "none", padding: "6px 10px" }}>
                  <span className="tokenharvest-wordmark" style={{ color: "#fff", fontSize: 28 }}>TokenHarvest</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 8, display: "flex" }}>
                  <X size={24} />
                </button>
              </div>
              {/* nav links */}
              <nav style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {([ ["Platform","platform"], ["Services","services"], ["Finance","finance"], ["About","about"] ] as const).map(([label, id]) => (
                  <button key={id} onClick={() => { scrollTo(id); setMobileMenuOpen(false); }}
                    style={{
                      background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer", color: "#fff", fontSize: 26, fontWeight: 300,
                      fontFamily: "'PT Sans', sans-serif", textAlign: "left",
                      padding: "18px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                    {label}
                    <ArrowRight size={16} style={{ color: ACCENT_LIGHT, opacity: 0.7 }} />
                  </button>
                ))}
              </nav>
              <nav className="homepage-mobile-utility-links" aria-label="Utility navigation">
                <Link href="/investors" onClick={() => setMobileMenuOpen(false)}>Investors</Link>
                <a href="/api-docs" onClick={() => setMobileMenuOpen(false)}>API Docs</a>
                <button type="button" onClick={() => { scrollTo("cta"); setMobileMenuOpen(false); }}>Contact</button>
              </nav>
              {/* auth */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
                {isSignedIn ? (
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    style={{ background: ACCENT, color: "#fff", padding: "16px 24px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Go to Dashboard <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link href="/get-started" onClick={() => setMobileMenuOpen(false)}
                    style={{ background: ACCENT, color: "#fff", padding: "16px 24px", textDecoration: "none", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Get Started <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ══ HERO ════════════════════════════════════════════════ */}
          <TokenHarvestHero hero={hero} />
          {/* ══ LIVE COMMODITY PRICE TICKER ═══════════════════════ */}
          <PriceTicker />

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
              <div className="homepage-services-grid" style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 20, position: "relative", zIndex: 10,
              }}>
                {services.map(({ title, sub, desc }, i) => (
                  <div key={title} className="homepage-service-card" data-service={i % 3} style={{
                    padding: "42px 40px 44px",
                    borderRadius: 6,
                    minHeight: 236,
                    transition: "box-shadow 0.3s ease, transform 0.3s ease",
                    boxShadow: "0 12px 32px rgba(16,40,34,0.08)",
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
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(16,40,34,0.08)";
                    (e.currentTarget as HTMLDivElement).style.zIndex = "1";
                  }}>
                    <div className="homepage-service-card-mark" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 600, color: "#232323", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--service-accent)", display: "inline-block", flexShrink: 0 }} />
                      {title}
                    </h3>
                    <p style={{ fontSize: 12, color: "rgba(35,35,35,0.5)", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px 15px" }}>{sub}</p>
                    <p style={{ fontSize: 16, color: "#696969", lineHeight: 1.75, margin: 0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══ ABOUT ════════════════════════════════════════════════ */}
          <section id="about" style={{ background: "#fdfdfd", padding: "120px 0 132px", overflow: "hidden" }}>
            <div className="homepage-about-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
              <div style={{ position: "relative", width: "100%", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "85%", height: "85%", borderRadius: "50%", background: "radial-gradient(circle, rgba(230,235,233,0.9) 0%, rgba(245,247,246,0) 70%)", zIndex: 0 }} />

                <div className="homepage-commodity-cluster" style={{ position: "relative", width: "100%", maxWidth: 540, aspectRatio: "1 / 1", zIndex: 1 }}>
                  <img src={`${BASE}/hero/tokenharvest-cacao.png`} className="commodity-float-5" alt="Cacao" style={{ position: "absolute", width: "36%", top: "42%", left: "-2%", zIndex: 1, filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.12))" }} />
                  <img src={`${BASE}/hero/tokenharvest-nuts.png`} className="commodity-float-4" alt="Nuts" style={{ position: "absolute", width: "38%", bottom: "0%", left: "10%", zIndex: 0, filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.15))" }} />
                  <img src={`${BASE}/hero/tokenharvest-tea.png`} className="commodity-float-2" alt="Tea leaves" style={{ position: "absolute", width: "42%", top: "8%", right: "8%", zIndex: 3, filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.12))" }} />
                   <img src={`${BASE}/hero/tokenharvest-red-cherries.png`} className="commodity-float-1" alt="Red coffee cherries" style={{ position: "absolute", width: "52%", top: "15%", left: "15%", zIndex: 4, filter: "drop-shadow(0 25px 35px rgba(0,0,0,0.18))" }} />
                  <img src={`${BASE}/hero/tokenharvest-grain.png`} className="commodity-float-3" alt="Grain" style={{ position: "absolute", width: "58%", bottom: "6%", right: "0%", zIndex: 5, filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.22))" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>{about.badge}</span>
                </div>
                <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 44px)", fontWeight: 400, color: "#111", lineHeight: 1.15, margin: "0 0 24px", whiteSpace: "pre-line", letterSpacing: "-0.01em" }}>
                  {about.heading}
                </h2>
                <p style={{ fontSize: 16, color: "#555", lineHeight: 1.85, marginBottom: 40 }}>
                  {about.body}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
                  {about.bullets.map((item, idx) => {
                    const colonIdx = item.indexOf(":");
                    const title = colonIdx >= 0 ? item.slice(0, colonIdx) : item;
                    const desc  = colonIdx >= 0 ? item.slice(colonIdx + 1).trim() : "";
                    const active = activePillar === idx;
                    return (
                      <li key={item}
                        onMouseEnter={() => setActivePillar(idx)}
                        onMouseLeave={() => setActivePillar(null)}
                        style={{ borderBottom: "1px solid #e2e2e2", padding: "16px 0", cursor: "default" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <ChevronRight size={14} style={{ color: active ? ACCENT : "#a0a0a0", flexShrink: 0, transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s", transform: active ? "rotate(90deg)" : "none" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? ACCENT : "#222", transition: "color 0.2s" }}>{title}</span>
                        </div>
                        <div style={{ overflow: "hidden", maxHeight: active ? 120 : 0, opacity: active ? 1 : 0, transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease", paddingLeft: 26 }}>
                          <p style={{ fontSize: 14.5, color: "#666", lineHeight: 1.7, margin: "10px 0 4px" }}>{desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>

          {/* ══ PLATFORM / HOW IT WORKS ─────────────────────────── */}
          <section id="platform" style={{ background: "#fff", padding: "64px 0 72px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              {/* section header */}
              <div style={{ textAlign: "center", marginBottom: 38 }}>
                <div style={{ width: 2, height: 28, background: ACCENT, margin: "0 auto 18px" }} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>How It Works</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#232323", margin: 0 }}>
                   From Harvest to Delivery
                </h2>
                 <h3 style={{ fontSize: "clamp(1.2rem, 2vw, 26px)", fontWeight: 400, color: "#555", margin: "14px 0 0" }}>
                   Built to Make Sourcing Effortless
                 </h3>
              </div>
              {/* 4-step grid */}
              <div className="homepage-steps-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},1fr)`, gap: 0 }}>
                 {steps.map(({ num, title, subtitle, tagline, desc }, i) => (
                   <div key={num} style={{ padding: "26px 28px 28px", borderLeft: i > 0 ? "1px solid #f0f0f0" : undefined, position: "relative" }}>
                    <div style={{ fontSize: 52, fontWeight: 300, color: "rgba(0,0,0,0.06)", lineHeight: 1, marginBottom: 12 }}>{num}</div>
                    <div style={{ width: 28, height: 2, background: ACCENT, marginBottom: 14 }} />
                     <h4 style={{ fontSize: 17, fontWeight: 700, color: "#232323", margin: "0 0 6px" }}>{title}</h4>
                     <div style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>{subtitle}</div>
                     <p style={{ fontSize: 14, color: "#555", fontStyle: "italic", lineHeight: 1.6, margin: "0 0 12px" }}>{tagline}</p>
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
             <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,12,0.68)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div className="homepage-stats-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${hpStats.length},1fr)`, gap: 40, textAlign: "center" }}>
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
            <div className="homepage-markets-strip" style={{ display: "flex", height: 500 }}>
              {markets.map(card => <MarketCard key={card.num} {...card} />)}
            </div>

          </section>

          {/* ══ ESG ──────────────────────────────────────────────── */}
          <EsgSection />

          {/* ══ TRADE FINANCE & LIQUIDITY ════════════════════════ */}
          <section id="finance" style={{ background: "#e8edea", padding: "96px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>Trade Finance &amp; Settlement</span>
                </div>
                <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 40px)", fontWeight: 500, color: "#090909", margin: "0 0 16px", lineHeight: 1.15 }}>
                  Capital for every stage of the trade.
                </h2>
                <div style={{ width: 40, height: 2, background: ACCENT, margin: "0 auto 20px" }} />
                <p style={{ color: "#555", fontSize: 16, fontWeight: 300, maxWidth: 680, margin: "0 auto", lineHeight: 1.6 }}>
                  Working capital tied to real inventory, contracts, invoices, and confirmed trades.
                </p>
              </div>
              <FinanceCarousel />
            </div>
          </section>

          {/* ══ PARTNERS ─────────────────────────────────────────── */}
          <PartnersSection />

          {/* ══ CTA ─────────────────────────────────────────────── */}
          <section id="cta" style={{
            position: "relative", minHeight: 600, padding: "78px 0 82px", display: "flex", alignItems: "center",
            background: `url(${photo("cta-harvest.jpg")}) center 48% / cover no-repeat`, overflow: "hidden",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,30,27,0.9) 0%, rgba(7,48,42,0.78) 50%, rgba(5,30,27,0.9) 100%), radial-gradient(circle at 50% 42%, rgba(91,177,157,0.2), transparent 62%)" }} />
            <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", padding: "0 32px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ed6558" }} />
                <span style={{ color: "#ed6558", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>Get Started</span>
              </div>
              <h2 style={{ fontSize: "clamp(2.1rem, 4.2vw, 46px)", fontWeight: 400, color: "#fff", lineHeight: 1.1, margin: "0 0 18px", whiteSpace: "pre-line", letterSpacing: "-0.03em" }}>
                {cta.heading}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.68)", fontSize: 14, fontWeight: 300, maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.65 }}>
                {cta.subheadline}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                <Link href="/get-started"
                  style={{ background: "#e55349", color: "#fff", padding: "13px 22px", textDecoration: "none", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {cta.cta1} <ArrowRight size={16} />
                </Link>
                <button onClick={() => setContactOpen(true)}
                   style={{ background: "rgba(255,255,255,0.04)", color: "#fff", padding: "13px 22px", border: "1px solid rgba(255,255,255,0.28)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'PT Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Contact Us
                </button>
              </div>
            </div>
          </section>

          {/* ══ FOOTER ──────────────────────────────────────────── */}
          <footer className="homepage-footer" style={{ background: "#0a0a0b", padding: "20px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
              <div className="homepage-footer-minimal">
                <div className="homepage-footer-brand">
                  <Link href="/" onClick={scrollHomeToTop} title="Home" style={{ display: "inline-flex", textDecoration: "none" }}>
                    <span className="tokenharvest-wordmark" style={{ color: "#fff", fontSize: 28 }}>TokenHarvest</span>
                  </Link>
                  <span className="homepage-footer-location">Tatu City, Kenya</span>
                </div>
                <nav className="homepage-footer-links" aria-label="Footer navigation">
                  <Link href="/get-started">Marketplace</Link>
                  <a href="https://portal.tokenharvest.ke" target="_blank" rel="noreferrer">Producer</a>
                  <button type="button" onClick={() => scrollTo("about")}>About</button>
                  <a href="https://tokenharvest.app" target="_blank" rel="noreferrer">App</a>
                </nav>
                <div className="homepage-footer-social" aria-label="Social media">
                  <a href="https://www.linkedin.com/company/tokenharvest" target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn">
                    <Linkedin size={17} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                  <a href="https://www.instagram.com/token.harvest/" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram">
                    <Instagram size={17} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61593201038599" target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook">
                    <Facebook size={17} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </footer>

        </div>

        {/* ══ CONTACT MODAL ═══════════════════════════════════════ */}
        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
