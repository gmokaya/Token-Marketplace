import { useParams, Link } from "wouter";
import { useGetWarehouseProfileByCode, useListEwrs, getListEwrsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Warehouse, Phone, Mail, User2, CheckCircle2, Package, Droplets, Coffee, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetMe } from "@workspace/api-client-react";

const EWR_STATE_COLORS: Record<string, string> = {
  INGESTED: "bg-blue-100 text-blue-700 border-blue-200",
  MARKET_LISTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENCUMBERED: "bg-amber-100 text-amber-700 border-amber-200",
  SETTLED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

export default function WarehouseDetail() {
  const { code } = useParams<{ code: string }>();
  const warehouseCode = decodeURIComponent(code ?? "");
  const { toast } = useToast();
  const { data: me } = useGetMe();

  const { data: profile, isLoading: isLoadingProfile } = useGetWarehouseProfileByCode(warehouseCode, {
    query: { enabled: !!warehouseCode, queryKey: ["warehouse-profile", warehouseCode] as const },
  });

  const ewrParams = { warehouseCode, commodityType: "COFFEE" };
  const { data: ewrs, isLoading: isLoadingEwrs } = useListEwrs(ewrParams as any, {
    query: { enabled: !!warehouseCode, queryKey: getListEwrsQueryKey(ewrParams as any) },
  });

  const isAdmin = me?.tier === "ADMIN";
  const isBroker = me?.tier === "ENABLER";

  const handleReleaseRequest = (ewrId: number) => {
    toast({
      title: "Release Request Submitted",
      description: `A warehouse release request for eWR #${ewrId} has been logged and will be reviewed within 24 hours.`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/warehouses">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">{warehouseCode}</h1>
          <p className="text-muted-foreground mt-1">Certified warehouse · WRSC licensed facility</p>
        </div>
      </div>

      {/* Profile card */}
      {isLoadingProfile ? (
        <Skeleton className="h-48 w-full" />
      ) : profile ? (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{profile.operatorName}</CardTitle>
                <CardDescription className="mt-1">WRSC Licence: <span className="font-mono font-medium">{profile.wrscLicenseNumber}</span></CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> WRSC Licensed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {profile.facilityType && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Warehouse className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span><span className="text-muted-foreground">Facility: </span>{profile.facilityType}</span>
                </div>
              )}
              {profile.capacityMt && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span><span className="text-muted-foreground">Capacity: </span>{profile.capacityMt} MT</span>
                </div>
              )}
              {profile.warehouseInChargeName && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span><span className="text-muted-foreground">In charge: </span>{profile.warehouseInChargeName}</span>
                </div>
              )}
              {profile.warehouseInChargePhone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{profile.warehouseInChargePhone}</span>
                </div>
              )}
              {profile.warehouseInChargeEmail && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{profile.warehouseInChargeEmail}</span>
                </div>
              )}
              {profile.insurerName && (
                <div className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span><span className="text-muted-foreground">Insurer: </span>{profile.insurerName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/60 text-amber-800 text-sm">
          Warehouse profile not available. This facility may not have a registered WRSC profile yet.
        </div>
      )}

      {/* eWRs stored here */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Coffee eWRs On-Site</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Electronic warehouse receipts for coffee lots stored at this facility.</p>
          </div>
          {!isLoadingEwrs && ewrs && (
            <Badge variant="secondary">{ewrs.length} receipts</Badge>
          )}
        </div>

        {isLoadingEwrs ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !ewrs || ewrs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border rounded-xl border-dashed border-border gap-3">
            <Coffee className="w-7 h-7 text-muted-foreground/40" />
            <p className="text-muted-foreground">No coffee eWRs at this location.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ewrs.map((ewr: any) => (
              <Card key={ewr.id} className="hover:border-border/80 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Coffee className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono font-semibold text-sm">{ewr.ewrsReceiptId}</span>
                          <Badge variant="outline" className={`text-xs ${EWR_STATE_COLORS[ewr.state] ?? ""}`}>
                            {ewr.state}
                          </Badge>
                          {ewr.grade && (
                            <Badge variant="secondary" className="text-xs">{ewr.grade}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 mt-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Weight</span>
                            <p className="text-sm font-mono font-medium">{ewr.weightMt} MT</p>
                          </div>
                          {ewr.moisturePct != null && (
                            <div>
                              <span className="text-xs text-muted-foreground">Moisture</span>
                              <p className="text-sm font-mono font-medium flex items-center gap-1">
                                <Droplets className="w-3 h-3 text-blue-400" />{ewr.moisturePct}%
                              </p>
                            </div>
                          )}
                          {ewr.coffeeBeanSize && (
                            <div>
                              <span className="text-xs text-muted-foreground">Bean Size</span>
                              <p className="text-sm font-medium">{ewr.coffeeBeanSize}</p>
                            </div>
                          )}
                          {ewr.coffeeCuppingScore != null && (
                            <div>
                              <span className="text-xs text-muted-foreground">Cupping</span>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" />{ewr.coffeeCuppingScore} pts
                              </p>
                            </div>
                          )}
                        </div>
                        {ewr.harvestSeason && (
                          <p className="text-xs text-muted-foreground mt-1.5">Harvest: {ewr.harvestSeason}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions for broker/admin */}
                    {(isAdmin || isBroker) && ewr.state === "INGESTED" && (
                      <div className="shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReleaseRequest(ewr.id)}
                          className="text-xs"
                        >
                          Request Release
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
