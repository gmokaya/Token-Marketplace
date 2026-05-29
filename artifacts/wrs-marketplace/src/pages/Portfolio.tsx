import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useGetMyPortfolio, useGetMe, useCreateSpotListing } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyPortfolioQueryKey, getListSpotListingsQueryKey } from "@workspace/api-client-react";

const getCommodityColor = (type: string) => {
  switch (type) {
    case "MAIZE": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
    case "RICE": return "bg-teal-500/20 text-teal-700 border-teal-500/50";
    case "COFFEE": return "bg-amber-800/20 text-amber-900 border-amber-800/50";
    case "TEA": return "bg-green-600/20 text-green-800 border-green-600/50";
    case "AVOCADO": return "bg-emerald-500/20 text-emerald-700 border-emerald-500/50";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStateColor = (state: string) => {
  switch (state) {
    case "INGESTED": return "bg-green-100 text-green-800";
    case "MARKET_LISTED": return "bg-blue-100 text-blue-800";
    case "AUCTION_ACTIVE": return "bg-sky-100 text-sky-800";
    case "FORWARD_BOUND": return "bg-lime-100 text-lime-800";
    case "LOCK_TRADING": return "bg-amber-100 text-amber-800";
    case "SETTLED": return "bg-gray-100 text-gray-600";
    case "ENCUMBERED": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getBatchTypeColor = (bt: string) => {
  switch (bt) {
    case "FUNGIBLE": return "bg-blue-50 text-blue-700 border-blue-200";
    case "SEMI_FUNGIBLE": return "bg-purple-50 text-purple-700 border-purple-200";
    case "NON_FUNGIBLE": return "bg-gray-50 text-gray-700 border-gray-300";
    case "TIME_DECAYING": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const getBatchTypeLabel = (bt: string) => {
  switch (bt) {
    case "FUNGIBLE": return "Fungible";
    case "SEMI_FUNGIBLE": return "Semi-Fungible";
    case "NON_FUNGIBLE": return "Non-Fungible";
    case "TIME_DECAYING": return "Time-Decaying";
    default: return bt;
  }
};

interface EwrItem {
  id: number;
  ewrsReceiptId: string;
  commodityType: string;
  batchType?: string | null;
  grade: string;
  weightMt: string | number;
  warehouseCode: string;
  state: string;
  estimatedValueUsd?: number | null;
  expiryAt?: string | null;
  isLienActive: boolean;
  // grading
  moisturePct?: string | number | null;
  foreignMatterPct?: string | number | null;
  brokenGrainsPct?: string | number | null;
  insectDamagedGrainsPct?: string | number | null;
  coffeeBeanSize?: string | null;
  coffeeCuppingScore?: string | number | null;
  teaProcessingType?: string | null;
  teaLeafGrade?: string | null;
  teaInvoiceSerial?: string | null;
  avocadoVariety?: string | null;
  avocadoSizingCode?: number | null;
  avocadoColdChainCompliant?: boolean | null;
  avocadoDegradationCoefficient?: string | number | null;
  poolGroupId?: string | null;
}

function GradingPanel({ ewr }: { ewr: EwrItem }) {
  const ct = ewr.commodityType;
  const pct = (v: string | number | null | undefined) => v != null ? `${parseFloat(String(v)).toFixed(2)}%` : "—";
  const num = (v: string | number | null | undefined, dp = 1) => v != null ? parseFloat(String(v)).toFixed(dp) : "—";

  if (ct === "MAIZE" || ct === "RICE") {
    const standard = ct === "MAIZE" ? "EAS 2:2013" : "EAS 128:2013";
    const maxMoisture = ct === "MAIZE" ? 13.5 : 14.0;
    const moistureVal = ewr.moisturePct != null ? parseFloat(String(ewr.moisturePct)) : null;
    const moistureWarning = moistureVal != null && moistureVal >= maxMoisture * 0.95;
    return (
      <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{standard}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Moisture</span>
          <span className={`font-medium text-right ${moistureWarning ? "text-amber-600" : ""}`}>{pct(ewr.moisturePct)} <span className="text-gray-400">/ {maxMoisture}%</span></span>
          <span className="text-muted-foreground">Foreign Matter</span>
          <span className="font-medium text-right">{pct(ewr.foreignMatterPct)} <span className="text-gray-400">/ 1%</span></span>
          <span className="text-muted-foreground">Broken Grains</span>
          <span className="font-medium text-right">{pct(ewr.brokenGrainsPct)} <span className="text-gray-400">/ 2%</span></span>
          <span className="text-muted-foreground">Insect Damaged</span>
          <span className="font-medium text-right">{pct(ewr.insectDamagedGrainsPct)} <span className="text-gray-400">/ 1%</span></span>
        </div>
        {ewr.poolGroupId && (
          <p className="text-[10px] text-blue-600 mt-1 truncate" title={ewr.poolGroupId}>
            Silo pool: <span className="font-mono">{ewr.poolGroupId}</span>
          </p>
        )}
      </div>
    );
  }

  if (ct === "COFFEE") {
    return (
      <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Coffee Grading</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Bean Size</span>
          <span className="font-medium text-right">{ewr.coffeeBeanSize ?? "—"}</span>
          <span className="text-muted-foreground">Cupping Score</span>
          <span className="font-medium text-right">{num(ewr.coffeeCuppingScore)} <span className="text-gray-400">/ 10</span></span>
          {ewr.moisturePct != null && <>
            <span className="text-muted-foreground">Moisture</span>
            <span className="font-medium text-right">{pct(ewr.moisturePct)}</span>
          </>}
        </div>
      </div>
    );
  }

  if (ct === "TEA") {
    return (
      <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tea Grading</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Processing</span>
          <span className="font-medium text-right">{ewr.teaProcessingType ?? "—"}</span>
          <span className="text-muted-foreground">Leaf Grade</span>
          <span className="font-medium text-right">{ewr.teaLeafGrade ?? "—"}</span>
          {ewr.teaInvoiceSerial && <>
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-medium text-right font-mono text-[10px]">{ewr.teaInvoiceSerial}</span>
          </>}
        </div>
      </div>
    );
  }

  if (ct === "AVOCADO") {
    const coeff = ewr.avocadoDegradationCoefficient != null ? parseFloat(String(ewr.avocadoDegradationCoefficient)) : null;
    const pctIntact = coeff != null ? Math.round(coeff * 100) : null;
    const qualityColor = pctIntact != null ? (pctIntact > 70 ? "text-green-600" : pctIntact > 40 ? "text-amber-600" : "text-red-600") : "";
    return (
      <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">EAS 19:2017 · CA Storage</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Variety</span>
          <span className="font-medium text-right">{ewr.avocadoVariety ?? "—"}</span>
          <span className="text-muted-foreground">Sizing Code</span>
          <span className="font-medium text-right">{ewr.avocadoSizingCode ?? "—"}</span>
          <span className="text-muted-foreground">Cold Chain</span>
          <span className="font-medium text-right">{ewr.avocadoColdChainCompliant ? "✓ Compliant" : "✗ Non-compliant"}</span>
          {pctIntact != null && <>
            <span className="text-muted-foreground">Quality Index</span>
            <span className={`font-medium text-right ${qualityColor}`}>{pctIntact}% intact</span>
          </>}
        </div>
      </div>
    );
  }

  return null;
}

function ListOnMarketDialog({ ewr, open, onClose }: { ewr: EwrItem | null; open: boolean; onClose: () => void }) {
  const [pricePerMt, setPricePerMt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createListing = useCreateSpotListing();
  const queryClient = useQueryClient();

  const defaultPrices: Record<string, string> = {
    MAIZE: "190", RICE: "580", COFFEE: "3500", TEA: "1450", AVOCADO: "1300",
  };

  const handleOpen = () => {
    if (ewr) setPricePerMt(defaultPrices[ewr.commodityType] ?? "");
    setError(null);
  };

  const handleSubmit = () => {
    const price = parseFloat(pricePerMt);
    if (!ewr || isNaN(price) || price <= 0) {
      setError("Please enter a valid price greater than 0.");
      return;
    }
    setError(null);
    createListing.mutate(
      { data: { ewrId: ewr.id, pricePerMt: price, currency: "USD" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyPortfolioQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSpotListingsQueryKey() });
          onClose();
        },
        onError: (err: any) => {
          setError(err?.message ?? "Failed to create listing. Please try again.");
        },
      }
    );
  };

  if (!ewr) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List eWR on Spot Market</DialogTitle>
          <DialogDescription>
            Set your asking price per metric tonne for <strong>{ewr.ewrsReceiptId}</strong> ({ewr.weightMt} MT · Grade {ewr.grade} · {ewr.warehouseCode}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Price per MT (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                className="pl-7"
                type="number"
                min={1}
                step={0.01}
                value={pricePerMt}
                onChange={e => { setPricePerMt(e.target.value); setError(null); }}
                placeholder={defaultPrices[ewr.commodityType] ?? "0"}
                data-testid="input-price-per-mt"
              />
            </div>
            {pricePerMt && !isNaN(parseFloat(pricePerMt)) && (
              <p className="text-xs text-muted-foreground">
                Estimated total: ${(parseFloat(pricePerMt) * parseFloat(String(ewr.weightMt))).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createListing.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createListing.isPending} data-testid="button-confirm-list">
            {createListing.isPending ? "Listing…" : "List on Market"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Portfolio() {
  const { data: portfolio, isLoading: portfolioLoading } = useGetMyPortfolio();
  const { data: user } = useGetMe();
  const [listingEwr, setListingEwr] = useState<EwrItem | null>(null);

  if (user?.tier !== "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          The eWR portfolio is only available to Producers.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My eWR Portfolio</h1>
            <p className="text-muted-foreground text-sm mt-1">Select an INGESTED receipt to list on the spot market</p>
          </div>
        </div>

        {portfolioLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimated Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="portfolio-total-value">
                    ${portfolio?.totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{portfolio?.ewrs.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ready to List</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {portfolio?.ewrs.filter(e => e.state === "INGESTED" && !e.isLienActive).length ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <h2 className="text-xl font-bold mt-8">Receipts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio?.ewrs.map(ewr => (
                <Card key={ewr.id} className="flex flex-col">
                  <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div>
                      <CardTitle className="text-base font-bold font-mono">{ewr.ewrsReceiptId}</CardTitle>
                      <p className="text-sm text-muted-foreground">{ewr.warehouseCode}</p>
                    </div>
                    <Badge variant="outline" className={getCommodityColor(ewr.commodityType)}>
                      {ewr.commodityType}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight</span>
                        <span className="font-medium">{ewr.weightMt} MT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grade</span>
                        <span className="font-medium">{ewr.grade}</span>
                      </div>
                      {ewr.estimatedValueUsd && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Value</span>
                          <span className="font-medium">${Number(ewr.estimatedValueUsd).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Batch Type</span>
                        {(ewr as EwrItem).batchType && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBatchTypeColor((ewr as EwrItem).batchType!)}`}>
                            {getBatchTypeLabel((ewr as EwrItem).batchType!)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="secondary" className={getStateColor(ewr.state)}>
                          {ewr.state.replace("_", " ")}
                        </Badge>
                      </div>
                      {ewr.isLienActive && (
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">LIEN</span>
                            {(ewr as any).lienLoanOutstandingUsd != null && (
                              <span className="text-xs font-semibold text-orange-700">
                                ${Number((ewr as any).lienLoanOutstandingUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })} outstanding
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-orange-700">Lien follows receipt to new owner</p>
                        </div>
                      )}
                      <GradingPanel ewr={ewr as unknown as EwrItem} />
                      {ewr.commodityType === "AVOCADO" && ewr.expiryAt && (() => {
                        const msLeft = new Date(ewr.expiryAt).getTime() - Date.now();
                        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                        const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const isUrgent = daysLeft < 7;
                        const isExpired = msLeft <= 0;
                        return (
                          <div className={`mt-2 pt-2 border-t ${isUrgent ? "border-red-200" : "border-amber-200"}`}>
                            <div className={`text-xs font-semibold flex justify-between ${isExpired ? "text-red-700" : isUrgent ? "text-red-600" : "text-amber-700"}`}>
                              <span>Expires:</span>
                              <span>{new Date(ewr.expiryAt).toLocaleDateString()}</span>
                            </div>
                            <div className={`text-xs mt-0.5 font-medium ${isExpired ? "text-red-700" : isUrgent ? "text-red-500" : "text-amber-600"}`}>
                              {isExpired
                                ? "⚠ EXPIRED"
                                : daysLeft > 0
                                  ? `⏱ ${daysLeft}d ${hoursLeft}h remaining`
                                  : `⏱ ${hoursLeft}h remaining`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                  {["INGESTED", "ENCUMBERED"].includes(ewr.state ?? "") && (
                    <CardFooter className="pt-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => setListingEwr(ewr as unknown as EwrItem)}
                        data-testid={`button-list-ewr-${ewr.id}`}
                      >
                        List on Market
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
              {portfolio?.ewrs.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  No electronic warehouse receipts found in your portfolio.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ListOnMarketDialog
        ewr={listingEwr}
        open={!!listingEwr}
        onClose={() => setListingEwr(null)}
      />
    </Layout>
  );
}
