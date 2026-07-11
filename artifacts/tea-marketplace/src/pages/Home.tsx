import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { value: "150+", label: "Tea Factories" },
  { value: "40+",  label: "Countries"    },
  { value: "$2B+", label: "Annual Volume" },
];

export default function Home() {
  /* ── Full-screen hero — visible to all visitors ── */
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col select-none">

      {/* Background — landscape tea plantation */}
      <img
        src={`${basePath}/photos/tea-plantation.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        fetchPriority="high"
      />

      {/* Layered gradient: dark vignette at top + heavy bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-black/80" />
      {/* Subtle left-to-right fade for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

      {/* ── Top nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-16">
        <Link href="/">
          <img
            src={`${basePath}/logo-white.png`}
            alt="TokenHarvest"
            className="h-18 w-auto cursor-pointer"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <button className="text-sm font-medium text-white/80 hover:text-white transition-colors px-4 py-2">
              Sign In
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="text-sm font-semibold bg-white text-[#0a2a2a] hover:bg-white/90 transition-colors px-5 py-2.5 flex items-center gap-2">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero copy — bottom-left anchored ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-8 md:px-14 pb-28">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/75 text-xs font-medium px-3 py-1.5 rounded-full mb-7 w-fit backdrop-blur-sm border border-white/15">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          B2B Tea Marketplace
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.0] tracking-tight max-w-3xl">
          Where premium teas
          <br />
          <span className="text-white">meet global buyers.</span>
        </h1>

        <p className="mt-5 text-white/55 text-base md:text-lg leading-relaxed max-w-xl">
          Every exceptional tea begins with its origin. TokenHarvest is the trusted marketplace for GI-protected and specialty teas, commercial teas empowering producers and buyers with verified provenance, Digital Tea Passports, embedded Trade Finance, and frictionless cross-border trade.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Link href="/sign-in">
            <button className="text-sm font-semibold bg-white text-[#0a2a2a] hover:bg-white/90 transition-colors px-7 py-3.5 flex items-center gap-2">
              Sign in to Terminal <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-colors px-7 py-3.5 backdrop-blur-sm">
              Create Account
            </button>
          </Link>
        </div>
      </div>

      {/* ── Stats bar — bottom ── */}
      <div className="relative z-10 flex items-center gap-12 md:gap-20 px-8 md:px-14 pb-10 pt-5 border-t border-white/10">
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
