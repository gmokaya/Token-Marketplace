import { Link } from "wouter";
import { ArrowRight, LogIn, LogOut } from "lucide-react";
import { useAuth, useClerk } from "@clerk/react";
import { PriceTicker } from "@/components/PriceTicker";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { value: "6",    label: "Grain Commodities" },
  { value: "90d",  label: "Certified Storage" },
  { value: "$1B+", label: "Annual Volume"      },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col select-none">

      {/* Background: grain field */}
      <img
        src={`${basePath}/photos/hero-soybean-farmer.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        fetchPriority="high"
      />

      {/* Layered gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

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
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/75 text-xs font-medium px-3 py-1.5 rounded-full mb-4 w-fit backdrop-blur-sm border border-white/15">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
          B2B Grain Market · East Africa
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.0] tracking-tight max-w-3xl">
          Where grain warrants
          <br />
          <span className="text-white">meet global buyers.</span>
        </h1>

        <p className="mt-3 text-white/55 text-sm md:text-base leading-relaxed max-w-xl">
          Every harvest begins in the field. GrainEx is the trusted B2B marketplace for tokenised warehouse receipts, connecting East African grain producers and off-takers through compliance-grade eWR issuance, live auctions, forward contracts, and embedded trade finance.
        </p>

        <div className="mt-5 flex items-center gap-4">
          <Link href="/sign-in">
            <button className="text-sm font-semibold bg-white text-[#1a0a00] hover:bg-white/90 transition-colors px-6 py-3 flex items-center gap-2">
              Sign in to Terminal <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-colors px-6 py-3 backdrop-blur-sm">
              Create Account
            </button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 flex items-center gap-12 md:gap-20 px-8 md:px-14 pb-16 pt-4 border-t border-white/10">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-white/40 text-xs tracking-widest uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <PriceTicker />
    </div>
  );
}
