import { Link } from "wouter";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useAuth, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { value: "6", label: "Grain commodities" },
  { value: "90d", label: "Certified storage" },
  { value: "$1B+", label: "Annual volume" },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  return (
    <div className="relative flex h-[100svh] min-h-[720px] w-screen select-none flex-col overflow-hidden bg-[#0d1318] text-white">
      <img
        src={`${basePath}/photos/hero-soybean-farmer.jpg`}
        alt="East African grain farmer standing in a field"
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />

      <div className="absolute inset-0 bg-[#0b1218]/25 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1218]/75 via-transparent to-[#0b1218]/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1218]/80 via-[#0b1218]/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(to bottom, black, transparent 72%)",
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <Link href="/">
          <span className="tokenharvest-wordmark cursor-pointer text-3xl text-white transition-opacity hover:opacity-80 md:text-4xl">
            TokenHarvest
          </span>
        </Link>
        <div className="flex items-center gap-5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/70 md:gap-8">
          <span className="hidden md:inline">Grain sourcing / 03</span>
          {isSignedIn ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              Sign out <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              Sign in <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </nav>

      <main className="relative z-10 flex flex-1 items-end px-6 pb-8 md:px-12 md:pb-10">
        <div className="grid w-full items-end gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.22em] text-white/75">
              <span className="h-2 w-2 rounded-full bg-slate-200 shadow-[0_0_18px_rgba(226,232,240,.85)]" />
              Certified grain · East Africa
            </div>

            <h1 className="max-w-3xl text-[3.25rem] font-bold leading-[0.94] tracking-[-0.045em] text-white sm:text-6xl md:text-8xl">
              Stored with proof.
              <br />
              <span className="text-slate-200/90">Traded with confidence.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/70 md:text-base md:leading-7">
              For millers, traders, and buyers sourcing East African grain.
              Discover certified lots with clear grade, warehouse, and delivery
              records—from the store to the market.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={isSignedIn ? "/dashboard" : "/sign-in"}>
                <span className="group inline-flex cursor-pointer items-center gap-3 bg-[#edf1f3] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#101820] transition-colors hover:bg-white">
                  {isSignedIn ? "Open sourcing desk" : "Enter sourcing desk"}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link href="/sign-up">
                <span className="inline-flex cursor-pointer items-center border border-white/35 bg-white/[0.06] px-5 py-3.5 text-xs font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm transition-colors hover:border-white/65 hover:bg-white/15 hover:text-white">
                  Create buyer account
                </span>
              </Link>
            </div>
          </div>

          <aside className="hidden border-l border-white/25 pl-6 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-200/80">
              The buyer&apos;s view
            </p>
            <p className="mt-4 text-2xl font-medium leading-tight tracking-[-0.025em] text-white">
              Know the lot
              <br />
              before it moves.
            </p>
            <div className="mt-8 space-y-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
              <p>Origin / grade / harvest</p>
              <p>Warehouse / eWR / delivery</p>
              <p className="text-slate-200/80">One clear chain of custody</p>
            </div>
          </aside>
        </div>
      </main>

      <div className="relative z-10 mx-6 grid grid-cols-3 border-t border-white/20 py-4 md:mx-12 md:py-5">
        {stats.map((stat) => (
          <div key={stat.label} className="border-r border-white/15 px-3 first:pl-0 last:border-r-0 md:px-6">
            <p className="text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">{stat.value}</p>
            <p className="mt-1 max-w-24 text-[9px] uppercase leading-3 tracking-[0.16em] text-white/50 md:max-w-none md:text-[10px]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}