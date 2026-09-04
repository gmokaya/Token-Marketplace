import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "./LaunchingSoon.css";

const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export default function LaunchingSoon() {
  const [form, setForm] = useState({ name: "", email: "", role: "Buyer" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const joinWaitlist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: `Please add me to the TokenHarvest market access waitlist. I am joining as a ${form.role}.`,
        }),
      });

      if (!response.ok) throw new Error("Waitlist request failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="launching-soon-page flex flex-col overflow-hidden bg-[#073B35] text-[#F6F4EF]">
      <header className="launching-soon-header relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F6F4EF]/65 transition-colors hover:text-[#F6F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFC4A]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <Link href="/" aria-label="TokenHarvest home">
          <span className="launching-soon-wordmark tokenharvest-wordmark text-3xl text-[#F6F4EF] md:text-4xl">TokenHarvest</span>
        </Link>
      </header>

      <main className="launching-soon-main relative mx-auto w-full max-w-6xl px-6 pb-20 pt-12 md:px-10 md:pb-28 md:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-28 h-[520px] w-[520px] rounded-full border border-[#DFFC4A]/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-[360px] w-[360px] rounded-full bg-[#DFFC4A]/10 blur-3xl"
        />

        <section className="launching-soon-section relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24">
          <div>
            <h1 className="launching-soon-headline max-w-3xl text-6xl font-light leading-[0.91] tracking-[-0.07em] md:text-8xl">
              Be first in line for{" "}
              <span className="text-[#DFFC4A]">what’s next.</span>
            </h1>
            <p className="launching-soon-description mt-8 max-w-xl text-lg leading-8 text-[#F6F4EF]/68 md:text-xl">
              The next chapter of trusted commodity trade is almost here. Join the early
              access list and get the first look when market access opens.
            </p>

            <div className="launching-soon-benefits mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                "Early access when we launch",
                "First look at verified lots",
                "Updates made for your role",
              ].map(item => (
                <div key={item} className="flex gap-2 text-sm leading-6 text-[#F6F4EF]/72">
                  <Check className="mt-1 shrink-0 text-[#DFFC4A]" size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="launching-soon-form-card relative rounded-[0.4rem] bg-[#F6F4EF] p-7 text-[#073B35] shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-10">
              {status === "done" ? (
                <div className="launching-soon-success flex min-h-[380px] flex-col items-center justify-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#DFFC4A]">
                    <Check size={28} />
                  </div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#073B35]/55">
                    You’re on the list
                  </p>
                  <h2 className="text-4xl font-medium leading-none tracking-[-0.06em] md:text-5xl">
                    Your seat is saved.
                  </h2>
                  <p className="mt-6 max-w-sm text-base leading-7 text-[#073B35]/65">
                    We’ll let you know the moment TokenHarvest market access is ready to open.
                  </p>
                  <Link
                    href="/"
                    className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#073B35] px-5 py-3 text-sm font-semibold text-[#F6F4EF] transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#073B35] focus-visible:ring-offset-2"
                  >
                    Explore TokenHarvest
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="launching-soon-form-heading mb-8 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#073B35]/55">
                        Early access
                      </p>
                      <h2 className="text-4xl font-medium leading-[0.95] tracking-[-0.06em] md:text-5xl">
                        Get closer to the source.
                      </h2>
                    </div>
                    <Mail className="mt-1 shrink-0 text-[#073B35]/45" size={24} strokeWidth={1.6} />
                  </div>

                  <form onSubmit={joinWaitlist} className="launching-soon-form space-y-5">
                    <label className="launching-soon-field block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#073B35]/55">
                        Your name
                      </span>
                      <input
                        required
                        type="text"
                        autoComplete="name"
                        placeholder="Full name"
                        value={form.name}
                        onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                        className="w-full border-0 border-b border-[#073B35]/20 bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[#073B35]/35 focus:border-[#073B35]"
                      />
                    </label>
                    <label className="launching-soon-field block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#073B35]/55">
                        Email address
                      </span>
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                        className="w-full border-0 border-b border-[#073B35]/20 bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[#073B35]/35 focus:border-[#073B35]"
                      />
                    </label>
                    <label className="launching-soon-field block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#073B35]/55">
                        I’m joining as a
                      </span>
                      <select
                        value={form.role}
                        onChange={event => setForm(current => ({ ...current, role: event.target.value }))}
                        className="w-full border-0 border-b border-[#073B35]/20 bg-transparent px-0 py-3 text-base outline-none transition-colors focus:border-[#073B35]"
                      >
                        <option>Buyer</option>
                        <option>Producer</option>
                        <option>Financier</option>
                        <option>Partner</option>
                      </select>
                    </label>

                    {status === "error" && (
                      <p role="alert" className="text-sm leading-6 text-[#9A3F35]">
                        We couldn’t save your spot just yet. Please try again.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="launching-soon-submit inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#DFFC4A] px-5 py-4 text-sm font-bold text-[#073B35] transition-transform hover:-translate-y-1 disabled:cursor-wait disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#073B35] focus-visible:ring-offset-2"
                    >
                      {status === "sending" ? "Saving your spot…" : "Join the waitlist"}
                      <ArrowRight size={16} />
                    </button>
                    <p className="launching-soon-note text-center text-xs leading-5 text-[#073B35]/45">
                      No noise. Just a note when the next market is ready.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="launching-soon-footer border-t border-[#F6F4EF]/10 px-6 py-7 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs uppercase tracking-[0.14em] text-[#F6F4EF]/45 sm:flex-row sm:items-center sm:justify-between">
          <span className="launching-soon-footer-brand">TokenHarvest — Kila Juhudi Ina Nafasi Duniani.</span>
          <span>Market access is coming soon.</span>
        </div>
      </footer>
    </div>
  );
}