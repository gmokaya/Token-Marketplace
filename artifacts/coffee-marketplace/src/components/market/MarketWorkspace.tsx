import { useMemo, useState } from "react";
import { Filter, Layers3, Package, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./market-workspace.css";

function EmptyStat({ label, detail, icon: Icon }: {
  label: string;
  detail: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="relative min-h-[75px] overflow-hidden border border-[#dfe3e3] bg-white p-2.5">
      <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#7b8588]">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2.5 font-mono text-sm font-bold text-[#9aa3a5]">— no data</div>
      <div className="mt-0.5 text-[9px] text-[#8b9496]">{detail}</div>
      <Icon className="absolute -bottom-4 -right-3 h-16 w-16 text-[#eef1f1]" aria-hidden="true" />
    </div>
  );
}

export default function MarketWorkspace() {
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const hasFilters = useMemo(() => Boolean(search.trim() || origin.trim()), [origin, search]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-6 border-b border-[#dfe3e3] pb-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8588]">
            <span className="h-1.5 w-1.5 bg-[#b66a3c]" aria-hidden="true" />
            Coffee Market
          </div>
          <h1 className="market-workspace-title text-xl font-bold tracking-[-0.03em] text-[#202427]">Spot Market</h1>
          <p className="mt-1 max-w-2xl text-[10px] text-[#6e797c]">
            Discover premium specialty coffee lots directly from origin.
          </p>
        </div>
        <div className="mt-8 flex shrink-0 gap-2">
          <label className="relative w-[170px]">
            <span className="sr-only">Search the Coffee Market</span>
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8a9496]" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search origins, grades..."
              className="h-7 rounded-none border-[#dfe3e3] bg-white pl-7 text-[10px] shadow-none focus-visible:ring-1 focus-visible:ring-[#25292c]"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-7 rounded-none border-[#dfe3e3] bg-white px-2.5 text-[10px] text-[#4f5a5d] shadow-none hover:bg-[#f0f2f2]"
            onClick={() => setOrigin(origin ? "" : "origin")}
            aria-pressed={Boolean(origin)}
          >
            <Filter className="mr-1.5 h-3 w-3" aria-hidden="true" />
            Filter
          </Button>
        </div>
      </header>

      {origin && (
        <div className="flex items-center gap-3 border border-[#dfe3e3] bg-white p-3">
          <label htmlFor="coffee-origin-filter" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b8588]">
            Filter origin
          </label>
          <Input
            id="coffee-origin-filter"
            value={origin === "origin" ? "" : origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="e.g. Kenya"
            className="h-9 max-w-xs rounded-none border-[#dfe3e3] shadow-none"
            autoFocus
          />
          {hasFilters && (
            <Button type="button" variant="ghost" className="h-9 rounded-none text-xs" onClick={() => { setSearch(""); setOrigin(""); }}>
              Clear
            </Button>
          )}
        </div>
      )}

      <section aria-label="Coffee Market summary" className="market-summary-grid">
        <EmptyStat icon={Layers3} label="Active listings" detail="lots available" />
        <EmptyStat icon={Package} label="Total volume" detail="settled USD" />
        <EmptyStat icon={Warehouse} label="Warehouse receipts" detail="eWRs on platform" />
        <EmptyStat icon={Search} label="Market activity" detail="live price discovery" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#202427]">Live Offers</h2>
            <p className="mt-1 text-sm text-[#7b8588]">Fixed-price lots available for immediate purchase.</p>
          </div>
        </div>
        <div className="flex min-h-[168px] flex-col items-center justify-center border border-[#dfe3e3] bg-white px-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center border border-[#e1e6e6] bg-[#f8f9f9]">
            <Search className="h-5 w-5 text-[#b7c0c1]" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-semibold text-[#3d4649]">
            {hasFilters ? "No lots match your filters" : "No active listings"}
          </h3>
          <p className="mt-1 max-w-sm text-[10px] text-[#879194]">
            {hasFilters ? "Try adjusting your filters or clearing them." : "Check back later for new specialty coffee lots."}
          </p>
          {hasFilters && (
            <Button type="button" variant="outline" className="mt-5 h-9 rounded-none text-xs" onClick={() => { setSearch(""); setOrigin(""); }}>
              Clear filters
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}