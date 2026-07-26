import { useState } from "react";
import { useListTeaLots, getListTeaLotsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Filter, Search, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function Market() {
  const [grade, setGrade] = useState("");
  const [origin, setOrigin] = useState("");

  const { data: lots, isLoading, isError } = useListTeaLots(
    { listingType: "FIXED_PRICE", status: "LIVE" },
    {
      query: {
        enabled: true,
        queryKey: getListTeaLotsQueryKey({ listingType: "FIXED_PRICE", status: "LIVE" }),
      },
    }
  );

  const fixedPriceLots = lots?.filter((l) => l.listingType === "FIXED_PRICE" && l.status === "LIVE") ?? [];

  const filteredLots = fixedPriceLots.filter(
    (l) =>
      (!grade  || l.grade.toLowerCase().includes(grade.toLowerCase())) &&
      (!origin || l.giOrigin.toLowerCase().includes(origin.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Spot Market"
        description="Fixed-price tea lots available for immediate purchase."
      />

      <Card className="rounded-none shadow-sm border border-border bg-card">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-end bg-muted/5">
          <div className="w-full md:w-72 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Grade</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g. BOP, BOPF"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="pl-9 rounded-none bg-background h-11"
              />
            </div>
          </div>
          <div className="w-full md:w-72 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Origin</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g. Kenya"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="pl-9 rounded-none bg-background h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-80 w-full rounded-none" />)}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground border border-border bg-muted/5">
          Failed to load market listings. Please try again.
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
          <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No spot listings</h3>
          <p className="text-muted-foreground mt-1">No fixed-price tea lots match your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLots.map((lot) => {
            const warehouseCode = (lot as any).warehouseCode as string | null;
            return (
              <Card
                key={lot.id}
                className="rounded-none shadow-sm flex flex-col hover:border-primary/50 transition-colors border border-border"
              >
                <CardHeader className="p-6 border-b bg-muted/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-bold">{lot.grade}</CardTitle>
                      <div className="text-sm font-medium text-muted-foreground mt-1">{lot.gradeMark}</div>
                    </div>
                    <Badge className="rounded-none px-2 py-1 tracking-wider text-[10px]">SPOT</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Origin</div>
                      <div className="font-medium">{lot.giOrigin}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Weight</div>
                      <div className="font-mono">{lot.netWeightKg} kg</div>
                    </div>

                    {/* Warehouse — always shown if available */}
                    {warehouseCode && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Warehouse className="w-3 h-3" /> Stored At
                        </div>
                        <div className="font-semibold text-sm">{(lot as any).warehouseProfile?.operatorName ?? warehouseCode}</div>
                        {(lot as any).warehouseProfile?.facilityType && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {(lot as any).warehouseProfile.facilityType === "CONTROLLED_ATMOSPHERE_COLD_STORAGE"
                              ? "Controlled Atmosphere / Cold Storage"
                              : (lot as any).warehouseProfile.facilityType === "DRY_GRAIN_SILO"
                              ? "Dry Grain Silo"
                              : (lot as any).warehouseProfile.facilityType}
                          </div>
                        )}
                        {(lot as any).warehouseProfile?.warehouseInChargeName && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            In charge: {(lot as any).warehouseProfile.warehouseInChargeName}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Price</div>
                      <div className="text-3xl font-black text-primary tracking-tight font-mono">
                        ${(lot.fixedPricePerKgUsd ?? lot.reservePriceUsd)?.toFixed(2)}
                        <span className="text-base text-muted-foreground font-normal tracking-normal">/kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <Link href={`/lots/${lot.id}`} className="block">
                      <Button className="w-full rounded-none h-11 font-semibold">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
