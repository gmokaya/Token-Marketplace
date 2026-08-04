import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Leaf, Warehouse, ArrowRight, Radio, Clock, AlertCircle, Globe } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  DRAFT:           "bg-muted text-muted-foreground",
  CATALOGUED:      "bg-blue-50 text-blue-700 border-blue-200",
  DISPATCHED:      "bg-amber-50 text-amber-700 border-amber-200",
  LIVE:            "bg-green-50 text-green-700 border-green-200",
  SOLD:            "bg-primary/10 text-primary border-primary/20",
  UNSOLD:          "bg-muted text-muted-foreground",
  WITHDRAWN:       "bg-muted text-muted-foreground",
  RESERVE_NOT_MET: "bg-red-50 text-red-700 border-red-200",
};

// Publication status visual config — compact badge variant
const PUB_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  live:          { label: "Live",    className: "bg-green-50 text-green-700 border-green-200", icon: Radio },
  pending:       { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  update_pending:{ label: "Updating",className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  failed:        { label: "Failed",  className: "bg-red-50 text-red-600 border-red-200",       icon: AlertCircle },
  not_published: { label: "Not Published", className: "bg-muted/60 text-muted-foreground",      icon: Globe },
  unpublished:   { label: "Unpublished",   className: "bg-muted/60 text-muted-foreground",      icon: Globe },
};

export default function ProducerDashboard() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ["/api/tea/lots", "owner", me?.id],
    queryFn: async ({ signal }) => {
      if (!me?.id) return [];
      const res = await fetch(`${BASE}/api/tea/lots?ownerId=${me.id}`, { signal, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load lots");
      return res.json() as Promise<any[]>;
    },
    enabled: !!me?.id,
  });

  const { data: portfolio, isLoading: ewrsLoading } = useQuery({
    queryKey: ["/api/ewrs/my-portfolio"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/my-portfolio`, { signal, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load eWRs");
      return res.json() as Promise<{ ewrs: any[]; totalValueUsd: number }>;
    },
  });

  // Fetch all publication records for this producer — scoped server-side to owned/brokered lots
  const { data: publications = [] } = useQuery<any[]>({
    queryKey: ["/api/listing-publications", "factory", me?.id],
    queryFn: async ({ signal }) => {
      if (!me?.id) return [];
      const res = await fetch(`${BASE}/api/listing-publications?factoryId=${me.id}`, {
        signal, credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load publication records");
      return res.json();
    },
    enabled: !!me?.id,
    // Re-poll while any record is pending so the badge updates automatically
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      return data?.some((p: any) => ["pending", "update_pending"].includes(p.status)) ? 4000 : false;
    },
  });

  // Build a lookup map: lotId → publication record
  const pubByLot = new Map<number, any>();
  for (const pub of publications) {
    if (pub.listingId != null) pubByLot.set(pub.listingId, pub);
  }

  const teaEwrs = (portfolio?.ewrs ?? []).filter(
    (e: any) => e.commodityType === "TEA" && e.state === "INGESTED",
  );

  const lots = lotsData ?? [];
  const activeLots = lots.filter((l: any) => ["CATALOGUED", "DISPATCHED", "LIVE"].includes(l.status));
  const soldLots  = lots.filter((l: any) => l.status === "SOLD");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Producer Dashboard"
        description="Manage your tea lots and direct market listings."
        actions={
          <Button
            onClick={() => setLocation("/producer/lots/new")}
            className="rounded-none h-10 px-5 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            List Tea Direct
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Available eWRs", value: ewrsLoading ? "-" : teaEwrs.length, sub: "TEA · INGESTED" },
          { label: "Active Lots",    value: lotsLoading ? "-" : activeLots.length, sub: "In catalogue or live" },
          { label: "Sold",           value: lotsLoading ? "-" : soldLots.length, sub: "All time" },
          { label: "Total Lots",     value: lotsLoading ? "-" : lots.length, sub: "All statuses" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Available eWRs from factory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Warehouse className="w-4 h-4" /> Available eWRs from Factory
          </h2>
          <Button variant="ghost" size="sm" className="rounded-none text-xs" onClick={() => setLocation("/producer/ewrs")}>
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        {ewrsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : teaEwrs.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No INGESTED tea eWRs. Your factory portal will push receipts here automatically.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {teaEwrs.slice(0, 4).map((ewr: any) => (
              <div key={ewr.id} className="bg-card border border-border p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{ewr.ewrsReceiptId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ewr.grade} · {parseFloat(ewr.weightMt).toFixed(3)} MT · {ewr.warehouseCode}
                  </p>
                  <p className="text-xs text-muted-foreground">{ewr.harvestSeason}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none text-xs shrink-0"
                  onClick={() => setLocation(`/producer/lots/new?ewrId=${ewr.id}`)}
                >
                  List this
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My lots — with per-lot marketplace publication badge */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
          <Leaf className="w-4 h-4" /> My Tea Lots
        </h2>
        {lotsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : lots.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No lots yet.{" "}
            <button className="underline" onClick={() => setLocation("/producer/lots/new")}>
              List your first lot →
            </button>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {lots.map((lot: any) => {
              const pub = pubByLot.get(lot.id);
              const pubStatus = pub?.status ?? "not_published";
              const pubConf = PUB_BADGE[pubStatus] ?? PUB_BADGE["not_published"];
              const PubIcon = pubConf.icon;

              return (
                <div
                  key={lot.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/lots/${lot.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {lot.grade} - {lot.gradeMark}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {parseFloat(lot.netWeightKg).toFixed(1)} kg net · {lot.giOrigin} · {lot.listingType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {["DRAFT", "CATALOGUED"].includes(lot.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-none text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/producer/lots/${lot.id}/edit`);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {/* Marketplace publication status */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex items-center gap-1 px-2 py-0.5 ${pubConf.className}`}
                      title={`Marketplace: ${pubConf.label}`}
                    >
                      <PubIcon className="w-2.5 h-2.5" />
                      {pubConf.label}
                    </Badge>
                    {/* Authoring status */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase tracking-wider ${STATUS_COLORS[lot.status] ?? ""}`}
                    >
                      {lot.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
