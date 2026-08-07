import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetSpotListing, useExecuteOrder, useCreateCoffeeRfq, useListCoffeeLots, getListCoffeeLotsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, Factory, Scale, Calendar, Droplets, MapPin,
  Loader2, Star, Leaf, MessageSquare, Coffee, Award
} from "lucide-react";

const CERT_COLORS: Record<string, string> = {
  "Fair Trade": "bg-green-50 text-green-700 border-green-200",
  "Rainforest Alliance": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Organic": "bg-lime-50 text-lime-700 border-lime-200",
  "UTZ": "bg-teal-50 text-teal-700 border-teal-200",
  "Cup of Excellence": "bg-amber-50 text-amber-700 border-amber-200",
  "Bird Friendly": "bg-sky-50 text-sky-700 border-sky-200",
  "Direct Trade": "bg-orange-50 text-orange-700 border-orange-200",
};

export default function LotDetail() {
  const { lotId } = useParams<{ lotId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rfqOpen, setRfqOpen] = useState(false);
  const [rfqForm, setRfqForm] = useState({ quantityMt: "", targetPricePerKg: "", message: "", preferredIncoterms: "" });

  const { data: listingDetail, isLoading: isLoadingListing } = useGetSpotListing(Number(lotId), {
    query: { enabled: !!lotId, queryKey: ["spot-listing", lotId] as const },
  });

  // Resolve the underlying coffee lot ID from the EWR owner — needed for the RFQ API which accepts lotId
  const ewrOwnerId = listingDetail?.ewr?.ownerId;
  const ewrId = listingDetail?.ewr?.id;
  const { data: ownerLots } = useListCoffeeLots(
    { ownerId: ewrOwnerId } as any,
    { query: { enabled: !!ewrOwnerId, queryKey: getListCoffeeLotsQueryKey({ ownerId: ewrOwnerId } as any) } }
  );
  const resolvedCoffeeLot = (ownerLots ?? []).find((l: any) => l.ewrId === ewrId);

  const executeOrder = useExecuteOrder();
  const createRfq = useCreateCoffeeRfq();

  const handleBuy = () => {
    executeOrder.mutate(
      { data: { listingId: Number(lotId) } },
      {
        onSuccess: (order) => {
          toast({ title: "Order Executed", description: "Lot secured. Redirecting to settlement." });
          setLocation(`/lots/${order.id}/settlement`);
        },
        onError: (err: any) => {
          toast({ title: "Purchase Failed", description: err?.error || "Could not execute order.", variant: "destructive" });
        },
      }
    );
  };

  const handleRfqSubmit = () => {
    if (!rfqForm.quantityMt || !rfqForm.targetPricePerKg) {
      toast({ title: "Missing fields", description: "Please fill in quantity and target price.", variant: "destructive" });
      return;
    }
    const qtyKg = parseFloat(rfqForm.quantityMt) * 1000;
    createRfq.mutate(
      {
        data: {
          lotId: resolvedCoffeeLot?.id,
          requestedQuantityKg: qtyKg,
          requestedPriceUsdPerKg: parseFloat(rfqForm.targetPricePerKg),
          message: rfqForm.message || undefined,
          preferredIncoterms: rfqForm.preferredIncoterms || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Quote Request Sent", description: "The broker will respond to your RFQ shortly." });
          setRfqOpen(false);
          setRfqForm({ quantityMt: "", targetPricePerKg: "", message: "", preferredIncoterms: "" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.error || "Failed to submit RFQ.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoadingListing) {
    return <div className="max-w-4xl mx-auto space-y-6"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!listingDetail) {
    return <div className="text-center py-12">Lot not found</div>;
  }

  const { listing, ewr } = listingDetail;
  const isAvailable = listing.status === "ACTIVE";
  const certifications: string[] = (ewr as any).certifications ?? [];
  const cuppingScore = (ewr as any).coffeeCuppingScore;
  const beanSize = (ewr as any).coffeeBeanSize;
  const processingMethod = (ewr as any).processingMethod ?? (listing as any).processingMethod;
  const varietal = (ewr as any).varietal;
  const altitude = (ewr as any).altitude;
  const giOrigin = (ewr as any).giOrigin ?? (listing as any).giOrigin;
  const gradeMark = (listing as any).gradeMark;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/market">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className={isAvailable ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
            {listing.status}
          </Badge>
          {listing.grade && <Badge variant="secondary">{listing.grade}</Badge>}
          {beanSize && <Badge variant="outline" className="font-mono text-xs">Bean Size {beanSize}</Badge>}
          <span className="text-sm text-muted-foreground font-mono">ID: {listing.id}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2 gap-4">
                <div>
                  <CardTitle className="text-2xl leading-tight">
                    {gradeMark || `${listing.grade || ewr.grade} Coffee Lot`}
                  </CardTitle>
                  {giOrigin && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{giOrigin}</span>
                    </div>
                  )}
                </div>
                {cuppingScore && (
                  <div className="flex flex-col items-center shrink-0">
                    <Badge
                      variant="outline"
                      className="text-lg px-3 py-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono font-bold gap-1.5"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {cuppingScore} pts
                    </Badge>
                    <span className="text-[10px] text-muted-foreground mt-0.5">SCA Cupping</span>
                  </div>
                )}
              </div>
              <CardDescription className="text-base">Offered by {listing.sellerName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Core metrics */}
              <div className="grid grid-cols-2 gap-y-5 gap-x-4 p-5 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-lg bg-background border shadow-sm"><Scale className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-0.5">Weight</div>
                    <div className="font-mono font-medium">{listing.weightMt} MT</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-lg bg-background border shadow-sm"><Droplets className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-0.5">Moisture</div>
                    <div className="font-mono font-medium">{ewr.moisturePct ?? "—"}%</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-lg bg-background border shadow-sm"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-0.5">Crop Year</div>
                    <div className="font-medium">{ewr.harvestSeason ?? "—"}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-lg bg-background border shadow-sm"><Factory className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-0.5">Warehouse</div>
                    <div className="font-medium">{ewr.warehouseCode}</div>
                  </div>
                </div>
              </div>

              {/* Coffee profile */}
              {(processingMethod || varietal || altitude || beanSize) && (
                <div>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-accent" /> Coffee Profile
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {processingMethod && (
                      <div className="p-3 rounded-lg bg-muted/40 border">
                        <div className="text-xs text-muted-foreground mb-1">Processing</div>
                        <div className="text-sm font-medium">{processingMethod}</div>
                      </div>
                    )}
                    {varietal && (
                      <div className="p-3 rounded-lg bg-muted/40 border">
                        <div className="text-xs text-muted-foreground mb-1">Varietal</div>
                        <div className="text-sm font-medium">{varietal}</div>
                      </div>
                    )}
                    {beanSize && (
                      <div className="p-3 rounded-lg bg-muted/40 border">
                        <div className="text-xs text-muted-foreground mb-1">Bean Size</div>
                        <div className="text-sm font-medium font-mono">{beanSize}</div>
                      </div>
                    )}
                    {altitude != null && (
                      <div className="p-3 rounded-lg bg-muted/40 border">
                        <div className="text-xs text-muted-foreground mb-1">Altitude</div>
                        <div className="text-sm font-medium font-mono">{altitude} masl</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cupping notes */}
              {(ewr as any).cuppingRemarks && (
                <div>
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" /> Cupping Notes
                  </h3>
                  <p className="text-sm text-muted-foreground italic p-3 rounded-lg bg-amber-50/40 border border-amber-100">
                    "{(ewr as any).cuppingRemarks}"
                  </p>
                </div>
              )}

              {/* Certifications */}
              {certifications.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" /> Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {certifications.map(cert => (
                      <Badge
                        key={cert}
                        variant="outline"
                        className={`gap-1.5 ${CERT_COLORS[cert] ?? "bg-muted/50"}`}
                      >
                        <Leaf className="w-3 h-3" /> {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* eWR traceability */}
              <div>
                <h3 className="font-bold mb-2">eWR Traceability</h3>
                <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Backed by verified Electronic Warehouse Receipt (ID:{" "}
                    <span className="font-mono">{ewr.ewrsReceiptId}</span>)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: purchase + RFQ */}
        <div className="space-y-4">
          <Card className="sticky top-24 border-primary-border shadow-lg">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Price per MT</span>
                <span className="font-mono font-bold">${listing.pricePerMt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-mono">{listing.weightMt} MT</span>
              </div>
              <div className="h-px w-full bg-border" />
              <div className="flex justify-between items-baseline text-lg">
                <span className="font-bold">Total Value</span>
                <span className="font-mono font-bold text-accent">
                  ${(listing.totalValueUsd || listing.pricePerMt * (listing.weightMt || 0)).toLocaleString()}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                className="w-full h-12 text-base font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!isAvailable || executeOrder.isPending}
                onClick={handleBuy}
              >
                {executeOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isAvailable ? "Secure Lot Now" : "Currently Unavailable"}
              </Button>

              {isAvailable && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setRfqOpen(true)}
                >
                  <MessageSquare className="w-4 h-4" /> Request Quote
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Warehouse link */}
          {ewr.warehouseCode && (
            <Link href={`/warehouses/${encodeURIComponent(ewr.warehouseCode)}`}>
              <Card className="hover:border-accent/40 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Stored at</div>
                    <div className="font-mono font-semibold text-sm">{ewr.warehouseCode}</div>
                  </div>
                  <Factory className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* RFQ Dialog */}
      <Dialog open={rfqOpen} onOpenChange={setRfqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
            <DialogDescription>
              Submit a quote request to the broker for this lot. They will respond with pricing and delivery terms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rfq-qty">Quantity (MT) *</Label>
                <Input
                  id="rfq-qty"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={listing.weightMt ?? undefined}
                  placeholder={`max ${listing.weightMt ?? ""} MT`}
                  value={rfqForm.quantityMt}
                  onChange={e => setRfqForm(f => ({ ...f, quantityMt: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rfq-price">Target Price ($/kg) *</Label>
                <Input
                  id="rfq-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 4.50"
                  value={rfqForm.targetPricePerKg}
                  onChange={e => setRfqForm(f => ({ ...f, targetPricePerKg: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rfq-incoterms">Preferred Incoterms (optional)</Label>
              <Input
                id="rfq-incoterms"
                placeholder="e.g. FOB Mombasa, CIF Hamburg"
                value={rfqForm.preferredIncoterms}
                onChange={e => setRfqForm(f => ({ ...f, preferredIncoterms: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rfq-msg">Message (optional)</Label>
              <Textarea
                id="rfq-msg"
                placeholder="Specific requirements, preferred certifications, shipment date..."
                value={rfqForm.message}
                onChange={e => setRfqForm(f => ({ ...f, message: e.target.value }))}
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqOpen(false)}>Cancel</Button>
            <Button onClick={handleRfqSubmit} disabled={createRfq.isPending} className="gap-2">
              {createRfq.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <MessageSquare className="w-3.5 h-3.5" /> Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
