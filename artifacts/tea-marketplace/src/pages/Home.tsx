import { Link } from "wouter";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useAuth, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const stats = [
  { value: "50+", label: "Verified factories" },
  { value: "7+", label: "Origin countries" },
  { value: "GI", label: "Protected origins" },
];

export default function Home() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  return (
    <div className="relative flex h-[100svh] min-h-[720px] w-screen select-none flex-col overflow-hidden bg-[#081714] text-white">
      <img
        src={`${basePath}/photos/tea-plantation.jpg`}
        alt="Tea fields in East Africa"
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />

      <div className="absolute inset-0 bg-[#061411]/20 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07120f]/65 via-transparent to-[#06100d]/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07120f]/70 via-[#07120f]/15 to-transparent" />
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
          <span className="hidden md:inline">Tea house sourcing / 01</span>
          {isSignedIn ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              Sign out <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <a
              href="/grain/sign-in"
              className="flex items-center gap-2 transition-colors hover:text-white"
            >
              Sign in <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </nav>

      <main className="relative z-10 flex flex-1 items-end px-6 pb-8 md:px-12 md:pb-10">
        <div className="grid w-full items-end gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.22em] text-white/75">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.85)]" />
              GI origins · East Africa
            </div>

            <h1 className="max-w-3xl text-[3.25rem] font-bold leading-[0.94] tracking-[-0.045em] text-white sm:text-6xl md:text-8xl">
              Distinctive teas.
              <br />
              <span className="text-emerald-100/90">Documented at origin.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/70 md:text-base md:leading-7">
              A sourcing desk for tea houses, blenders, and buyers who want more
              than a grade sheet. Discover GI-protected speciality teas with
              clear lot records, factory provenance, and a direct route from
              East Africa to your shelves.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <Link href="/broker">
                  <span className="group inline-flex cursor-pointer items-center gap-3 bg-[#f2efe5] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#0a2620] transition-colors hover:bg-white">
                    Open sourcing desk
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <a href="/grain/sign-in">
                  <span className="group inline-flex cursor-pointer items-center gap-3 bg-[#f2efe5] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#0a2620] transition-colors hover:bg-white">
                    Enter sourcing desk
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </a>
              )}
              <a href="/grain/sign-up">
                <span className="inline-flex cursor-pointer items-center border border-white/35 bg-white/[0.06] px-5 py-3.5 text-xs font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm transition-colors hover:border-white/65 hover:bg-white/15 hover:text-white">
                  Create buyer account
                </span>
              </a>
            </div>
          </div>

          <aside className="hidden border-l border-white/25 pl-6 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-200/80">
              The buyer&apos;s view
            </p>
            <p className="mt-4 text-2xl font-medium leading-tight tracking-[-0.025em] text-white">
              Know the leaf
              <br />
              before it arrives.
            </p>
            <div className="mt-8 space-y-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
              <p>Origin / grade / harvest</p>
              <p>Factory / certification / lot</p>
              <p className="text-emerald-200/80">One clear chain of custody</p>
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
