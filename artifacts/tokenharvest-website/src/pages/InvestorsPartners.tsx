import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InvestorsPartners() {
  return (
    <div className="min-h-screen bg-[#f7f5ed] text-[#0b3032]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0b3032]/65 transition-colors hover:text-[#d93839] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d93839]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <Link href="/" aria-label="TokenHarvest home" className="text-decoration-none">
          <span className="tokenharvest-wordmark text-3xl text-[#0b3032] md:text-4xl">TokenHarvest</span>
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
          <div className="max-w-4xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#d93839]">
              Investors &amp; Partners
            </p>
            <h1 className="max-w-3xl text-5xl font-light leading-[0.98] tracking-[-0.06em] text-[#0b3032] md:text-8xl">
              Back the infrastructure behind better commodity trade.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-[#0b3032]/70 md:text-lg">
              TokenHarvest connects verified origin supply, qualified buyers, and trade finance
              through one auditable marketplace for East African commodities.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-3 bg-[#d93839] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d93839] focus-visible:ring-offset-2"
              >
                Explore the marketplace <ArrowRight size={15} />
              </Link>
              <a
                href="#partner-opportunities"
                className="inline-flex items-center gap-3 border border-[#0b3032]/30 px-5 py-3 text-sm font-semibold text-[#0b3032] transition-colors hover:border-[#d93839] hover:text-[#d93839] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d93839]"
              >
                Partner with us <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-[#0b3032]/10 bg-white/55">
          <div className="mx-auto grid max-w-6xl gap-px px-6 md:grid-cols-2 md:px-10">
            <article className="py-12 md:pr-16 md:py-16">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#d93839]">
                For investors
              </p>
              <h2 className="text-3xl font-medium tracking-[-0.04em] md:text-4xl">
                Participate in a more transparent trade economy.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#0b3032]/65">
                We are building the rails that make agricultural inventory, contracts, and
                settlement easier to verify and finance. Connect with the team to learn about
                the platform, market opportunity, and partnership pathways.
              </p>
            </article>
            <article className="border-t border-[#0b3032]/10 py-12 md:border-l md:border-t-0 md:pl-16 md:py-16">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#dcae56]">
                For strategic partners
              </p>
              <h2 className="text-3xl font-medium tracking-[-0.04em] md:text-4xl">
                Bring capability closer to origin.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#0b3032]/65">
                Join the network of organizations helping producers, buyers, lenders, and
                logistics teams move verified commodity flows from source to final delivery.
              </p>
            </article>
          </div>
        </section>

        <section id="impact" className="relative isolate overflow-hidden bg-[#0b3032] text-[#f7f5ed]">
          <img
            src={`${BASE}/photos/impact-containers.jpg`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover rotate-90 scale-[1.3] opacity-45"
          />
          <div className="absolute inset-0 bg-[#0b3032]/85" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
            <div className="grid gap-10 md:grid-cols-[0.75fr_1.25fr] md:gap-24">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#b9e8cf]">
                  Impact
                </p>
                <h2 className="text-4xl font-light leading-tight tracking-[-0.05em] md:text-6xl">
                  Better trade should create better outcomes.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-base leading-8 text-white/65 md:text-lg">
                  TokenHarvest is designed to help farmers capture more value from what they
                  grow, connect with better markets, and build more resilient livelihoods.
                </p>
                <div className="mt-10 grid gap-px border-y border-white/15 sm:grid-cols-2">
                  {[
                    ["5", "East African countries", "Platform access"],
                    ["Up to 25%", "Projected farmer-earnings uplift", "Modeled target"],
                    ["24 hrs", "Trade and settlement target", "Designed for faster settlement"],
                    ["15+", "Established destination markets", "Conservative launch framing"],
                  ].map(([value, label, note]) => (
                    <div key={label} className="border-b border-white/15 py-6 sm:pr-8">
                      <div className="text-3xl font-light tracking-[-0.04em] text-white md:text-4xl">{value}</div>
                      <div className="mt-2 text-sm font-medium text-white/85">{label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">{note}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 grid gap-px border-t border-white/15 sm:grid-cols-2">
                  {[
                    ["01", "Increased farmer incomes", "Better price discovery and clearer trade terms can help farmers retain more value from each harvest."],
                    ["02", "Direct market access", "Producer networks can connect with qualified buyers without relying on fragmented, opaque channels."],
                    ["03", "Access to working capital", "Verified inventory and confirmed orders can make formal trade finance more accessible."],
                    ["04", "Less post-harvest loss", "Better coordination across storage, movement, and delivery can help protect value before produce reaches market."],
                  ].map(([number, title, description]) => (
                    <article key={number} className="border-b border-white/15 py-6 sm:pr-8">
                      <span className="text-xs font-semibold tracking-[0.18em] text-[#b9e8cf]">{number}</span>
                      <h3 className="mt-3 text-xl font-medium tracking-[-0.02em]">{title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="partner-opportunities" className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-24">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#d93839]">
                Partner network
              </p>
              <h2 className="text-4xl font-light leading-tight tracking-[-0.05em] md:text-6xl">
                Built for the people who move value.
              </h2>
            </div>
            <div className="grid gap-0 border-t border-[#0b3032]/15">
              {[
                ["Origin networks", "Verified producer groups and storage operators"],
                ["Market access", "Qualified buyers and off-takers"],
                ["Capital", "Lenders and working-capital providers"],
                ["Trade infrastructure", "Technology, logistics, and settlement partners"],
              ].map(([title, description], index) => (
                <div key={title} className="grid gap-3 border-b border-[#0b3032]/15 py-5 md:grid-cols-[170px_1fr] md:gap-8">
                  <span className="text-sm font-semibold text-[#0b3032]">
                    {String(index + 1).padStart(2, "0")} {title}
                  </span>
                  <span className="text-sm leading-6 text-[#0b3032]/60">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0a0a0b] px-6 py-8 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs uppercase tracking-[0.14em] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>Investors &amp; Partners</span>
          <Link href="/" className="transition-colors hover:text-white">Return to TokenHarvest</Link>
        </div>
      </footer>
    </div>
  );
}