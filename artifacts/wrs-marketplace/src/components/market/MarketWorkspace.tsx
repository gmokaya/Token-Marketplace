import { useMemo, useState } from "react";
import { Filter, Layers3, Package, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MarketKind = "grain" | "coffee" | "tea";

const MARKET_COPY: Record<MarketKind, {
  name: string;
  description: string;
  emptyDescription: string;
}> = {
  grain: {
    name: "Grain Market",
    description: "Discover certified grain lots with clear origin and warehouse provenance.",
    emptyDescription: "Check back later for new certified grain lots.",
  },
  coffee: {
    name: "Coffee Market",
    description: "Discover premium specialty coffee lots directly from origin.",
    emptyDescription: "Check back later for new specialty coffee lots.",
  },
  tea: {
    name: "Tea Market",
    description: "Discover traceable tea lots with grade, origin, and factory records.",
    emptyDescription: "Check back later for new traceable tea lots.",
  },
};

function EmptyStat({ label, detail, icon: Icon }: {
  label: string;
  detail: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="relative min-h-[108px] overflow-hidden border border-[#dfe3e3] bg-white p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b8588]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-4 font-mono text-xl font-bold text-[#9aa3a5]">— no data</div>
      <div className="mt-1 text-xs text-[#8b9496]">{detail}</div>
      <Icon className="absolute -bottom-4 -right-3 h-20 w-20 text-[#eef1f1]" aria-hidden="true" />
    </div>
  );
}

export default function MarketWorkspace({ market }: { market: MarketKind }) {
  const copy = MARKET_COPY[market];
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");

  const hasFilters = useMemo(
    () => Boolean(search.trim() || origin.trim()),
    [origin, search],
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-[#dfe3e3] pb-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7b8588]">
            <span className="h-2 w-2 bg-[#25292c]" aria-hidden="true" />
            {copy.name}
          </div>
          <h1 className="font-sans text-3xl font-bold tracking-[-0.03em] text-[#202427]">Spot Market</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6e797c]">{copy.description}</p>
        </div>

        <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:w-64">
            <span className="sr-only">Search the {copy.name}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9496]" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search origins, grades..."
              className="h-10 rounded-none border-[#dfe3e3] bg-white pl-9 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-[#25292c]"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-none border-[#dfe3e3] bg-white px-3 text-[#4f5a5d] shadow-none hover:bg-[#f0f2f2]"
            onClick={() => setOrigin(origin ? "" : "origin")}
            aria-pressed={Boolean(origin)}
          >
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            Filter
          </Button>
        </div>
      </header>

      {origin && (
        <div className="flex items-center gap-3 border border-[#dfe3e3] bg-white p-3">
          <label htmlFor="market-origin-filter" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b8588]">
            Filter origin
          </label>
          <Input
            id="market-origin-filter"
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

      <section aria-label={`${copy.name} summary`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex min-h-[250px] flex-col items-center justify-center border border-[#dfe3e3] bg-white px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[#e1e6e6] bg-[#f8f9f9]">
            <Search className="h-7 w-7 text-[#b7c0c1]" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[#3d4649]">
            {hasFilters ? "No lots match your filters" : "No active listings"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#879194]">
            {hasFilters ? "Try adjusting your filters or clearing them." : copy.emptyDescription}
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