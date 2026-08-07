import { Link } from "wouter";
import { ArrowRight, LogIn, LogOut, CheckCircle2, Star, Warehouse, ShieldCheck } from "lucide-react";
import { useAuth, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { value: "87+",    label: "Specialty Lots"    },
  { value: "14",     label: "Origins"            },
  { value: "WRSC",   label: "Certified Warehouses" },
];

const pillars = [
  {
    icon: Star,
    title: "Specialty Grade",
    desc: "Every lot carries a verified SCA cupping score, bean-size classification, and moisture reading from intake — traceable from farm to roaster.",
  },
  {
    icon: Warehouse,
    title: "Warehouse-Backed",
    desc: "All coffee is held in WRSC-licensed facilities. Each eWR links the physical lot to a digital receipt — the legal basis for trade and finance.",
  },
  {
    icon: ShieldCheck,
    title: "Broker Enabled",
    desc: "Licensed brokers hold producer mandates and catalogue lots on their behalf. Buyers transact with confidence knowing every offer is authorised.",
  },
  {
    icon: CheckCircle2,
    title: "Traceable Finance",
    desc: "Working capital against warehouse receipts, forward contracts, and embedded escrow — structured finance built into the trading flow.",
  },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col select-none">

      {/* Background */}
      <img
        src={`${basePath}/photos/cafe-imports-coffee-storage.jpg`}
        alt="Specialty green coffee in warehouse storage sacks"
        className="absolute inset-0 w-full h-full object-cover object-center"
        fetchPriority="high"
      />

      {/* Layered gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-8">
        <Link href="/">
          <span className="tokenharvest-wordmark text-white text-4xl cursor-pointer">TokenHarvest</span>
        </Link>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <Link href="/sign-in" title="Sign in">
              <button className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <LogIn className="w-5 h-5" />
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero copy, bottom-left anchored */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-8 md:px-14 pb-8">

        {/* Category pill */}
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-4 w-fit backdrop-blur-sm border border-white/15">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Specialty Coffee Marketplace
        </div>

        <h1 className="coffee-hero-title text-5xl md:text-7xl font-bold text-white leading-[1.0] tracking-tight max-w-3xl">
          From origin
          <br />
          <span className="text-white">to roaster.</span>
        </h1>

        <p className="mt-4 text-white/60 text-sm md:text-base leading-relaxed max-w-xl">
          A trusted B2B platform for specialty and commercial green coffee. Every lot is backed by an
          Electronic Warehouse Receipt, graded at intake with cupping scores and bean-size data, and
          brokered by licensed agents with producer mandates.
        </p>

        {/* Feature pillars — compact horizontal on desktop */}
        <div className="mt-5 hidden md:flex gap-6 max-w-2xl">
          {pillars.map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-2 text-white/60 text-xs">
              <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{title}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>
            <button
              data-testid="button-sign-in"
              className="text-sm font-semibold bg-white text-[#1a0d05] hover:bg-white/90 transition-colors px-6 py-3 flex items-center gap-2"
            >
              {isSignedIn ? "Go to Marketplace" : "Access Marketplace"} <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          {!isSignedIn && (
            <>
              <Link href="/sign-up">
                <button
                  data-testid="button-create-account"
                  className="text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-colors px-6 py-3 backdrop-blur-sm"
                >
                  Register as Buyer
                </button>
              </Link>
              <Link href="/sign-up">
                <button
                  className="text-sm font-medium text-white/60 hover:text-white/90 transition-colors px-4 py-3"
                >
                  Broker / Producer? <span className="underline underline-offset-2">Apply here →</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 flex items-center gap-10 md:gap-20 px-8 md:px-14 pb-6 pt-4 border-t border-white/10">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-white/40 text-xs tracking-widest uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
