import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATS = [
  { value: "6",    suffix: "",   label: "Grain Commodities" },
  { value: "4",    suffix: "",   label: "Participant Tiers"  },
  { value: "100",  suffix: "%",  label: "eWR Tokenised"     },
  { value: "90",   suffix: "d",  label: "Certified Storage" },
];

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
      {/* Hero photo */}
      <img
        src={`${BASE}/photos/hero-soybean-farmer.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-75"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 md:px-12 py-7">
        <img
          src={`${BASE}/logo-white.png`}
          alt="GrainEx"
          className="h-7 w-auto"
        />
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/dashboard">
              <button className="flex items-center gap-2 bg-white text-[#1a0a00] text-sm font-semibold px-5 py-2.5 hover:bg-white/90 transition-colors">
                Open Terminal <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <button className="text-white/75 text-sm font-medium hover:text-white transition-colors px-4 py-2.5">
                  Sign In
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="flex items-center gap-2 bg-white text-[#1a0a00] text-sm font-semibold px-5 py-2.5 hover:bg-white/90 transition-colors">
                  Create Account <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-8 md:px-12 pb-10 md:pb-14">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Grain Market · East Africa
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-3 max-w-2xl">
          East Africa's grain<br />market infrastructure.
        </h1>
        <p className="text-white/55 text-base md:text-lg max-w-xl mb-8 leading-relaxed">
          Trade tokenised warehouse receipts for Maize, Rice, Wheat, Barley, Soybean and Sorghum —
          with compliance-grade eWR issuance and forward contract settlement.
        </p>

        <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
          <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-6 py-3 transition-colors mb-10">
            {isSignedIn ? "Open Terminal" : "Enter Platform"}{" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>

        {/* Stats */}
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-white/10 pt-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-xl md:text-2xl font-bold text-white leading-none">
                {s.value}{s.suffix}
              </p>
              <p className="text-xs text-white/45 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
