import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, GripVertical, Globe, Save, ImageOff,
  LayoutTemplate, Layers, Info, ListOrdered, BarChart3, Users, Megaphone, Image,
} from "lucide-react";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/* ── Types ─────────────────────────────────────────────── */

type Partner = { id: string; name: string; short: string; logoUrl: string; website: string };

type HeroContent = { badge: string; headline: string; subheadline: string; cta1: string; cta2: string };
type ServiceCard = { icon: string; title: string; sub: string; desc: string };
type AboutContent = { badge: string; heading: string; body: string; bullets: string[] };
type HowItWorksStep = { num: string; title: string; desc: string };
type StatCounter = { target: number; suffix: string; label: string };
type CtaContent = { heading: string; subheadline: string; cta1: string; cta2: string };
type MarketCard = { num: string; name: string; grade: string; desc: string; photo: string; link: string };

type HomepageContent = {
  hero: HeroContent;
  services: ServiceCard[];
  about: AboutContent;
  howItWorks: HowItWorksStep[];
  stats: StatCounter[];
  cta: CtaContent;
  markets: MarketCard[];
};

/* ── Defaults ───────────────────────────────────────────── */

const DEFAULT_HERO: HeroContent = {
  badge: "WRS Marketplace",
  headline: "Agricultural\nMarketplace",
  subheadline: "Trade Electronic Warehouse Receipts securely. Live auctions, forward contracts, and warehouse financing across East Africa.",
  cta1: "Join the Marketplace",
  cta2: "Our Services",
};

const DEFAULT_SERVICES: ServiceCard[] = [
  { icon: "icon-tax.png",        title: "Spot Market",       sub: "For Producers",  desc: "List your eWRs on the live marketplace. Access transparent pricing and verified buyers instantly." },
  { icon: "icon-money-1.png",    title: "Live Auctions",     sub: "For Off-Takers", desc: "Compete in real-time sealed-bid auctions with automatic anti-snipe protection and fair price discovery." },
  { icon: "icon-financial-1.png",title: "Forward Contracts", sub: "For Financiers", desc: "Lock in future delivery prices with performance-bond escrow and immutable audit trails." },
];

const DEFAULT_ABOUT: AboutContent = {
  badge: "The Platform",
  heading: "East Africa's Leading\neWR Marketplace",
  body: "WRS Marketplace connects producers, off-takers, and financiers in a single, fully auditable trading environment, backed by licensed warehouses and an immutable transaction ledger.",
  bullets: [
    "§6.1 state-machine enforced eWR lifecycle",
    "Real-time auctions with anti-snipe window",
    "Forward contracts with performance bond escrow",
    "Warehouse financing up to 60% of market value",
    "SHA-256 audit log on every transaction",
  ],
};

const DEFAULT_HOW_IT_WORKS: HowItWorksStep[] = [
  { num: "01", title: "Intake & Grading",   desc: "Commodity arrives at a licensed warehouse. WMS staff grade, weigh, and issue a digital eWR linked to physical stock." },
  { num: "02", title: "List or Auction",    desc: "Producer posts to the spot marketplace, creates a timed auction, or locks in a forward contract with a buyer." },
  { num: "03", title: "Trade Executes",     desc: "Bids clear or orders match. The state machine transitions the eWR through MARKET_LISTED → SOLD automatically." },
  { num: "04", title: "Settlement & Payout",desc: "Platform fee withheld, bank lien cleared, producer receives net proceeds. Full audit trail immutably recorded." },
];

const DEFAULT_STATS: StatCounter[] = [
  { target: 20,   suffix: "+", label: "eWRs Issued" },
  { target: 5,    suffix: "",  label: "Commodities" },
  { target: 97,   suffix: "%", label: "Audit Coverage" },
  { target: 1200, suffix: "+", label: "Transactions" },
];

const DEFAULT_CTA: CtaContent = {
  heading: "Ready to Trade\nwith Confidence?",
  subheadline: "Join producers, off-takers, and financiers already using WRS Marketplace to trade East African commodities with full transparency.",
  cta1: "Create Your Account",
  cta2: "Sign In",
};

const DEFAULT_MARKETS: MarketCard[] = [
  { num: "01", name: "Maize",   grade: "Grade A–C",    link: "/sign-in", desc: "White & Yellow varieties with 90-day certified storage, fully backed by registered warehouses.", photo: "https://picsum.photos/seed/maize-field/400/640" },
  { num: "02", name: "Rice",    grade: "Grade A–B",    link: "/sign-in", desc: "Milled & paddy rice from certified storage facilities across East Africa.", photo: "https://picsum.photos/seed/rice-paddy/400/640" },
  { num: "03", name: "Coffee",  grade: "AA / AB / PB", link: "/sign-in", desc: "Washed & natural-process beans, export-ready and auction-listed at the Nairobi Coffee Exchange.", photo: "https://picsum.photos/seed/coffee-beans/400/640" },
  { num: "04", name: "Tea",     grade: "BOPI / FNDC",  link: "/sign-in", desc: "Orthodox & CTC grades, Mombasa auction listed with full provenance traceability.", photo: "https://picsum.photos/seed/tea-plantation/400/640" },
  { num: "05", name: "Avocado", grade: "Hass Export",  link: "/sign-in", desc: "Cold-chain certified Hass avocados meeting EU/UK market phytosanitary standards.", photo: "https://picsum.photos/seed/avocado-farm/400/640" },
  { num: "06", name: "Sorghum", grade: "Grade A",      link: "/sign-in", desc: "Food & feed-grade sorghum with extended shelf life, ideal for long-tenor forward contracts.", photo: "https://picsum.photos/seed/sorghum-grain/400/640" },
];

const DEFAULT_PARTNERS: Partner[] = [
  { id: "1", name: "Kenya Cereal Board",          short: "KCB", logoUrl: "", website: "https://kdb.go.ke" },
  { id: "2", name: "East African Community",      short: "EAC", logoUrl: "", website: "https://eac.int" },
  { id: "3", name: "African Development Bank",    short: "ADB", logoUrl: "", website: "https://afdb.org" },
  { id: "4", name: "Equity Bank Kenya",           short: "EBK", logoUrl: "", website: "https://equitybankgroup.com" },
  { id: "5", name: "Kilimo Trust",                short: "KT",  logoUrl: "", website: "https://kilimotrust.org" },
  { id: "6", name: "Kenya National Farmers Fed.", short: "KNF", logoUrl: "", website: "https://kenaff.org" },
  { id: "7", name: "WFP East Africa",             short: "WEA", logoUrl: "", website: "https://wfp.org" },
  { id: "8", name: "USAID AgriLinks",             short: "UA",  logoUrl: "", website: "https://agrilinks.org" },
];

/* ── Helpers ────────────────────────────────────────────── */

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function LogoPreview({ logoUrl, name }: { logoUrl: string; name: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [logoUrl]);
  if (!logoUrl || broken) {
    return (
      <div className="w-14 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0">
        <ImageOff className="w-4 h-4 text-gray-400" />
      </div>
    );
  }
  return (
    <img src={logoUrl} alt={name} className="h-10 w-14 object-contain rounded shrink-0"
      onError={() => setBroken(true)} />
  );
}

/* ── Tab definitions ─────────────────────────────────────── */

const TABS = [
  { id: "hero",         label: "Hero",             Icon: LayoutTemplate },
  { id: "services",     label: "Services",         Icon: Layers },
  { id: "about",        label: "About",            Icon: Info },
  { id: "how-it-works", label: "How It Works",     Icon: ListOrdered },
  { id: "stats",        label: "Stats",            Icon: BarChart3 },
  { id: "cta",          label: "CTA",              Icon: Megaphone },
  { id: "markets",      label: "Available Markets",Icon: Image },
  { id: "partners",     label: "Partners",         Icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Main Component ─────────────────────────────────────── */

export default function AdminHomepage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [services, setServices] = useState<ServiceCard[]>(DEFAULT_SERVICES);
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>(DEFAULT_HOW_IT_WORKS);
  const [stats, setStats] = useState<StatCounter[]>(DEFAULT_STATS);
  const [cta, setCta] = useState<CtaContent>(DEFAULT_CTA);
  const [markets, setMarkets] = useState<MarketCard[]>(DEFAULT_MARKETS);
  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS);

  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/api/content/homepage`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/content/partners`).then(r => r.ok ? r.json() : null),
    ]).then(([hpRes, ptRes]) => {
      if (hpRes.status === "fulfilled" && hpRes.value?.value) {
        const v: Partial<HomepageContent> = hpRes.value.value;
        if (v.hero)       setHero(v.hero);
        if (v.services?.length)   setServices(v.services);
        if (v.about)      setAbout(v.about);
        if (v.howItWorks?.length) setHowItWorks(v.howItWorks);
        if (v.stats?.length)      setStats(v.stats);
        if (v.cta)        setCta(v.cta);
        if (v.markets?.length) setMarkets(v.markets);
      }
      if (ptRes.status === "fulfilled" && ptRes.value?.value?.partners?.length) {
        setPartners(ptRes.value.value.partners);
      }
    }).finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const body: HomepageContent = { hero, services, about, howItWorks, stats, cta, markets };
      const [hpRes, ptRes] = await Promise.all([
        fetch(`${API}/api/content/homepage`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ value: body }),
        }),
        fetch(`${API}/api/content/partners`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ value: { partners } }),
        }),
      ]);
      if (!hpRes.ok || !ptRes.ok) throw new Error("Save failed");
      toast({ title: "Saved", description: "Homepage content updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [hero, services, about, howItWorks, stats, cta, markets, partners, toast]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Homepage Content</h1>
            <p className="text-muted-foreground mt-1">Edit every public-facing section of the landing page.</p>
          </div>
          <Button onClick={save} disabled={saving || loading} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save All Changes"}
          </Button>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading current content…</p>
        )}

        {!loading && (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={[
                    "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                    activeTab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {activeTab === "hero" && (
              <HeroTab hero={hero} setHero={setHero} />
            )}
            {activeTab === "services" && (
              <ServicesTab services={services} setServices={setServices} />
            )}
            {activeTab === "about" && (
              <AboutTab about={about} setAbout={setAbout} />
            )}
            {activeTab === "how-it-works" && (
              <HowItWorksTab steps={howItWorks} setSteps={setHowItWorks} />
            )}
            {activeTab === "stats" && (
              <StatsTab stats={stats} setStats={setStats} />
            )}
            {activeTab === "cta" && (
              <CtaTab cta={cta} setCta={setCta} />
            )}
            {activeTab === "markets" && (
              <MarketsTab markets={markets} setMarkets={setMarkets} />
            )}
            {activeTab === "partners" && (
              <PartnersTab partners={partners} setPartners={setPartners} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/* ═══════════════ TAB PANELS ═══════════════════════════════ */

/* ── Hero ──────────────────────────────────────────────── */
function HeroTab({ hero, setHero }: { hero: HeroContent; setHero: (h: HeroContent) => void }) {
  const set = (k: keyof HeroContent, v: string) => setHero({ ...hero, [k]: v });
  return (
    <div className="grid gap-4">
      <SectionCard title="Hero Section" desc="The full-screen banner at the top of the homepage.">
        <Field label="Badge label (small caps above headline)" value={hero.badge} onChange={v => set("badge", v)} />
        <Field label="Headline (use \\n for line break)" value={hero.headline} onChange={v => set("headline", v)} textarea />
        <Field label="Subheadline / body text" value={hero.subheadline} onChange={v => set("subheadline", v)} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary CTA button" value={hero.cta1} onChange={v => set("cta1", v)} />
          <Field label="Secondary CTA button" value={hero.cta2} onChange={v => set("cta2", v)} />
        </div>
      </SectionCard>
      <PreviewCard>
        <div className="bg-[#161616] rounded p-8 text-white">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 block mb-3">{hero.badge}</span>
          <h2 className="text-4xl font-light leading-tight mb-3 whitespace-pre-line">{hero.headline}</h2>
          <p className="text-gray-400 text-sm mb-5 max-w-md leading-relaxed">{hero.subheadline}</p>
          <div className="flex gap-3 flex-wrap">
            <span className="bg-[#0a2a2a] text-white text-sm px-5 py-2.5 inline-block">{hero.cta1} →</span>
            <span className="bg-[#323232] text-white text-sm px-5 py-2.5 inline-block">{hero.cta2} →</span>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── Services ──────────────────────────────────────────── */
function ServicesTab({ services, setServices }: { services: ServiceCard[]; setServices: (s: ServiceCard[]) => void }) {
  const update = (i: number, k: keyof ServiceCard, v: string) =>
    setServices(services.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  return (
    <div className="grid gap-4">
      {services.map((svc, i) => (
        <SectionCard key={i} title={`Service Card ${i + 1}`} desc="">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={svc.title} onChange={v => update(i, "title", v)} />
            <Field label="Sub-label (e.g. For Producers)" value={svc.sub} onChange={v => update(i, "sub", v)} />
          </div>
          <Field label="Description" value={svc.desc} onChange={v => update(i, "desc", v)} textarea />
        </SectionCard>
      ))}
      <PreviewCard>
        <div className="grid grid-cols-3 gap-0 bg-white rounded shadow-sm overflow-hidden">
          {services.map((s, i) => (
            <div key={i} className={`p-6 ${i < 2 ? "border-r border-gray-100" : ""}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">{s.title}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{s.sub}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── About ─────────────────────────────────────────────── */
function AboutTab({ about, setAbout }: { about: AboutContent; setAbout: (a: AboutContent) => void }) {
  const set = (k: keyof Omit<AboutContent, "bullets">, v: string) => setAbout({ ...about, [k]: v });
  const setBullet = (i: number, v: string) =>
    setAbout({ ...about, bullets: about.bullets.map((b, idx) => idx === i ? v : b) });
  const addBullet = () => setAbout({ ...about, bullets: [...about.bullets, ""] });
  const removeBullet = (i: number) => setAbout({ ...about, bullets: about.bullets.filter((_, idx) => idx !== i) });
  return (
    <div className="grid gap-4">
      <SectionCard title="About / Platform Section" desc="The split-layout section describing the platform.">
        <Field label="Badge label" value={about.badge} onChange={v => set("badge", v)} />
        <Field label="Heading (use \\n for line break)" value={about.heading} onChange={v => set("heading", v)} textarea rows={2} />
        <Field label="Body paragraph" value={about.body} onChange={v => set("body", v)} textarea />
      </SectionCard>
      <SectionCard title="Feature Bullets" desc="The checklist shown below the body text.">
        <div className="space-y-2">
          {about.bullets.map((b, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={b} onChange={e => setBullet(i, e.target.value)} className="h-8 text-sm flex-1" />
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 shrink-0 h-8 w-8"
                onClick={() => removeBullet(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addBullet}>
            <Plus className="w-4 h-4" /> Add Bullet
          </Button>
        </div>
      </SectionCard>
      <PreviewCard>
        <div className="bg-[#e8e8e8] rounded p-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#0a2a2a] block mb-2">{about.badge}</span>
          <h3 className="text-2xl font-medium text-gray-900 mb-3 whitespace-pre-line leading-snug">{about.heading}</h3>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">{about.body}</p>
          <ul className="space-y-1.5">
            {about.bullets.map((b, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-[#0a2a2a] mt-0.5">›</span>{b}
              </li>
            ))}
          </ul>
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── How It Works ──────────────────────────────────────── */
function HowItWorksTab({ steps, setSteps }: { steps: HowItWorksStep[]; setSteps: (s: HowItWorksStep[]) => void }) {
  const update = (i: number, k: keyof HowItWorksStep, v: string) =>
    setSteps(steps.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const add = () => setSteps([...steps, { num: String(steps.length + 1).padStart(2, "0"), title: "", desc: "" }]);
  const remove = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  return (
    <div className="grid gap-4">
      <SectionCard title="How It Works — Steps" desc="The 4-column process walkthrough on the homepage."
        action={<Button variant="outline" size="sm" className="gap-1.5" onClick={add}><Plus className="w-4 h-4" />Add Step</Button>}>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50 items-start">
            <div className="flex flex-col gap-0.5 shrink-0 mt-1">
              <button onClick={() => { if (i > 0) { const n = [...steps]; [n[i-1],n[i]]=[n[i],n[i-1]]; setSteps(n); } }}
                disabled={i===0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5 leading-none">▲</button>
              <button onClick={() => { if (i < steps.length-1) { const n = [...steps]; [n[i],n[i+1]]=[n[i+1],n[i]]; setSteps(n); } }}
                disabled={i===steps.length-1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5 leading-none">▼</button>
            </div>
            <div className="flex-1 grid grid-cols-[80px_1fr] gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Step #</Label>
                <Input value={step.num} onChange={e => update(i, "num", e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Title</Label>
                <Input value={step.title} onChange={e => update(i, "title", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                <Textarea value={step.desc} onChange={e => update(i, "desc", e.target.value)} className="text-sm min-h-[56px]" />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 shrink-0 h-8 w-8 mt-1"
              onClick={() => remove(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </SectionCard>
      <PreviewCard>
        <div className="grid gap-0 bg-white rounded shadow-sm overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s, i) => (
            <div key={i} className={`p-5 ${i > 0 ? "border-l border-gray-100" : ""}`}>
              <div className="text-4xl font-light text-gray-100 leading-none mb-2">{s.num}</div>
              <div className="w-6 h-0.5 bg-[#0a2a2a] mb-2" />
              <p className="text-sm font-semibold text-gray-800 mb-1">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── Stats ─────────────────────────────────────────────── */
function StatsTab({ stats, setStats }: { stats: StatCounter[]; setStats: (s: StatCounter[]) => void }) {
  const update = (i: number, k: keyof StatCounter, v: string | number) =>
    setStats(stats.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const add = () => setStats([...stats, { target: 0, suffix: "", label: "" }]);
  const remove = (i: number) => setStats(stats.filter((_, idx) => idx !== i));
  return (
    <div className="grid gap-4">
      <SectionCard title="Stats / Counters" desc="The animated numbers shown over the dark banner photo."
        action={<Button variant="outline" size="sm" className="gap-1.5" onClick={add}><Plus className="w-4 h-4" />Add Stat</Button>}>
        {stats.map((s, i) => (
          <div key={i} className="flex gap-3 items-center p-3 border border-gray-100 rounded-lg bg-gray-50/50">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Target number</Label>
                <Input type="number" value={s.target} onChange={e => update(i, "target", Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Suffix (e.g. +, %)</Label>
                <Input value={s.suffix} onChange={e => update(i, "suffix", e.target.value)} className="h-8 text-sm" placeholder="+" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Label</Label>
                <Input value={s.label} onChange={e => update(i, "label", e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 shrink-0 h-8 w-8"
              onClick={() => remove(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </SectionCard>
      <PreviewCard>
        <div className="bg-[#0c0c0c] rounded p-8">
          <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-light text-white leading-none mb-2">{s.target}{s.suffix}</div>
                <div className="w-6 h-0.5 bg-[#0a2a2a] mx-auto mb-2" />
                <div className="text-gray-500 text-xs uppercase tracking-widest font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── CTA ───────────────────────────────────────────────── */
function CtaTab({ cta, setCta }: { cta: CtaContent; setCta: (c: CtaContent) => void }) {
  const set = (k: keyof CtaContent, v: string) => setCta({ ...cta, [k]: v });
  return (
    <div className="grid gap-4">
      <SectionCard title="CTA Section" desc="The dark call-to-action section near the bottom of the page.">
        <Field label="Heading (use \\n for line break)" value={cta.heading} onChange={v => set("heading", v)} textarea rows={2} />
        <Field label="Subheadline / body text" value={cta.subheadline} onChange={v => set("subheadline", v)} textarea />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary CTA button" value={cta.cta1} onChange={v => set("cta1", v)} />
          <Field label="Secondary CTA button" value={cta.cta2} onChange={v => set("cta2", v)} />
        </div>
      </SectionCard>
      <PreviewCard>
        <div className="bg-[#080808] rounded p-8 text-center">
          <h3 className="text-3xl font-light text-white mb-3 whitespace-pre-line leading-tight">{cta.heading}</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">{cta.subheadline}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <span className="bg-[#0a2a2a] text-white text-sm px-6 py-2.5 inline-block">{cta.cta1} →</span>
            <span className="bg-[#2a2a2a] text-white text-sm px-6 py-2.5 inline-block">{cta.cta2}</span>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

/* ── Partners ──────────────────────────────────────────── */
function PartnersTab({ partners, setPartners }: { partners: Partner[]; setPartners: (p: Partner[]) => void }) {
  const update = (id: string, k: keyof Partner, v: string) =>
    setPartners(partners.map(p => p.id === id ? { ...p, [k]: v } : p));
  const remove = (id: string) => setPartners(partners.filter(p => p.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = partners.findIndex(p => p.id === id);
    if (i + dir < 0 || i + dir >= partners.length) return;
    const next = [...partners];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setPartners(next);
  };
  const add = () => setPartners([...partners, { id: uid(), name: "", short: "", logoUrl: "", website: "" }]);

  return (
    <div className="grid gap-4">
      <SectionCard title="Partner Logos" desc="Logos shown in the Trusted Partners section of the homepage."
        action={<Button variant="outline" size="sm" className="gap-1.5" onClick={add}><Plus className="w-4 h-4" />Add Partner</Button>}>
        {partners.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No partners yet.</p>
        )}
        {partners.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => move(p.id, -1)} disabled={i === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5 leading-none">▲</button>
              <GripVertical className="w-4 h-4 text-gray-300" />
              <button onClick={() => move(p.id, 1)} disabled={i === partners.length - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-0.5 leading-none">▼</button>
            </div>
            <LogoPreview logoUrl={p.logoUrl} name={p.name} />
            <div className="flex-1 grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                <Input value={p.name} onChange={e => update(p.id, "name", e.target.value)} placeholder="Partner name" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Short</Label>
                <Input value={p.short} onChange={e => update(p.id, "short", e.target.value)} placeholder="KCB" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Logo URL</Label>
                <Input value={p.logoUrl} onChange={e => update(p.id, "logoUrl", e.target.value)} placeholder="https://…/logo.png" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Website</Label>
                <Input value={p.website} onChange={e => update(p.id, "website", e.target.value)} placeholder="https://…" className="h-8 text-sm" />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 shrink-0 h-8 w-8"
              onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </SectionCard>
      <PreviewCard>
        <div className="bg-[#f5f5f5] rounded p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-4">Trusted Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {partners.filter(p => p.name).map(p => (
              <div key={p.id} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                {p.logoUrl
                  ? <img src={p.logoUrl} alt={p.name} className="h-9 w-[72px] object-contain" />
                  : <div className="w-[72px] h-9 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-400">{p.short || "?"}</div>
                }
                <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[72px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

/* ═══════════════ SHARED UI PRIMITIVES ══════════════════════ */

function SectionCard({
  title, desc, children, action,
}: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function PreviewCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Live Preview</CardTitle>
          <Badge variant="outline" className="text-[10px] py-0">read-only</Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, textarea, rows,
}: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {textarea
        ? <Textarea value={value} onChange={e => onChange(e.target.value)} className="text-sm"
            style={{ minHeight: rows ? `${rows * 40}px` : "80px" }} />
        : <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 text-sm" />
      }
    </div>
  );
}

/* ── Available Markets ─────────────────────────────────── */

function MarketsTab({ markets, setMarkets }: { markets: MarketCard[]; setMarkets: React.Dispatch<React.SetStateAction<MarketCard[]>> }) {
  const update = (i: number, field: keyof MarketCard, value: string) =>
    setMarkets(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const addCard = () =>
    setMarkets(prev => [
      ...prev,
      { num: String(prev.length + 1).padStart(2, "0"), name: "New Commodity", grade: "Grade A", desc: "", photo: "", link: "/sign-in" },
    ]);

  const removeCard = (i: number) =>
    setMarkets(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <SectionCard
        title="Available Markets"
        desc="Each card appears in the full-bleed photo strip on the homepage."
        action={
          <Button size="sm" variant="outline" onClick={addCard} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Market
          </Button>
        }
      >
        <div className="space-y-6">
          {markets.map((m, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Card {m.num}</span>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeCard(i)}
                  disabled={markets.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Commodity Name" value={m.name} onChange={v => update(i, "name", v)} />
                <Field label="Grade / Tag" value={m.grade} onChange={v => update(i, "grade", v)} />
              </div>
              <Field label="Description" value={m.desc} onChange={v => update(i, "desc", v)} textarea rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Photo URL" value={m.photo} onChange={v => update(i, "photo", v)} />
                <Field label="Link (CTA href)" value={m.link} onChange={v => update(i, "link", v)} />
              </div>
              {m.photo && (
                <div className="mt-1 h-28 rounded overflow-hidden border">
                  <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
