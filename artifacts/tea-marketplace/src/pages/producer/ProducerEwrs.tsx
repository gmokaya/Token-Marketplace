import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATE_COLORS: Record<string, string> = {
  INGESTED:       "bg-green-50 text-green-700 border-green-200",
  MARKET_LISTED:  "bg-blue-50 text-blue-700 border-blue-200",
  AUCTION_ACTIVE: "bg-amber-50 text-amber-700 border-amber-200",
  SETTLED:        "bg-muted text-muted-foreground",
  EXTINGUISHED:   "bg-muted text-muted-foreground",
};

export default function ProducerEwrs() {
  const [, setLocation] = useLocation();

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["/api/ewrs/my-portfolio"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/my-portfolio`, { signal });
      if (!res.ok) throw new Error("Failed to load eWRs");
      return res.json() as Promise<{ ewrs: any[]; totalValueUsd: number }>;
    },
  });

  const teaEwrs = (portfolio?.ewrs ?? []).filter((e: any) => e.commodityType === "TEA");

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Tea eWRs"
        description="Electronic Warehouse Receipts pushed from your factory portal."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : teaEwrs.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No tea eWRs yet. Your factory portal will push receipts here automatically.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ensure your factory mark is set in your profile and the factory system has your marketplace API key.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {teaEwrs.map((ewr: any) => (
            <div key={ewr.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{ewr.ewrsReceiptId}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wider ${STATE_COLORS[ewr.state] ?? ""}`}
                  >
                    {ewr.state}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ewr.grade} · {parseFloat(ewr.weightMt).toFixed(3)} MT · {ewr.warehouseCode} ·{" "}
                  {ewr.harvestSeason}
                </p>
                {ewr.teaProcessingType && (
                  <p className="text-xs text-muted-foreground">
                    {ewr.teaProcessingType} · {ewr.teaLeafGrade} · Invoice: {ewr.teaInvoiceSerial}
                  </p>
                )}
                {ewr.estimatedValueUsd && (
                  <p className="text-xs text-muted-foreground">
                    Est. value: USD {parseFloat(ewr.estimatedValueUsd).toLocaleString()}
                  </p>
                )}
              </div>
              {ewr.state === "INGESTED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none text-xs shrink-0"
                  onClick={() => setLocation(`/producer/lots/new?ewrId=${ewr.id}`)}
                >
                  List this
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
