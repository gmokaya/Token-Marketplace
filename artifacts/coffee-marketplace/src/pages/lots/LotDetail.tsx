import { useParams, Link, useLocation } from "wouter";
import { useGetSpotListing, useExecuteOrder, useGetEwr } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Factory, Scale, Calendar, Droplets, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function LotDetail() {
  const { lotId } = useParams<{ lotId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // We view a spot listing here. In a real app we might differentiate between spot listings and auction lots.
  const { data: listingDetail, isLoading: isLoadingListing } = useGetSpotListing(Number(lotId), { query: { enabled: !!lotId } });
  const executeOrder = useExecuteOrder();

  const handleBuy = () => {
    executeOrder.mutate(
      { data: { listingId: Number(lotId) } },
      {
        onSuccess: (order) => {
          toast({ title: "Order Executed", description: "Lot secured. Redirecting to settlement." });
          setLocation(`/lots/${order.id}/settlement`); // Assuming we redirect to order settlement
        },
        onError: (err) => {
          toast({ title: "Purchase Failed", description: err.error || "Could not execute order.", variant: "destructive" });
        }
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
  const isAvailable = listing.status === 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/market">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={isAvailable ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
            {listing.status}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">ID: {listing.id}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-2xl leading-tight">
                  {listing.grade || ewr.grade} Coffee Lot
                </CardTitle>
                {ewr.coffeeCuppingScore && (
                  <Badge variant="outline" className="text-lg px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono font-bold">
                    {ewr.coffeeCuppingScore} pts
                  </Badge>
                )}
              </div>
              <CardDescription className="text-base">Offered by {listing.sellerName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 p-5 bg-muted/30 rounded-xl border border-border/50">
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
                    <div className="font-mono font-medium">{ewr.moisturePct}%</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-lg bg-background border shadow-sm"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-0.5">Crop Year</div>
                    <div className="font-medium">{ewr.harvestSeason}</div>
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

              <div>
                <h3 className="font-bold mb-2">eWR Traceability</h3>
                <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  Backed by verified Electronic Warehouse Receipt (ID: <span className="font-mono">{ewr.ewrsReceiptId}</span>)
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 border-primary-border shadow-lg">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Purchase Summary</CardTitle>
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
                <span className="font-mono font-bold text-accent">${(listing.totalValueUsd || (listing.pricePerMt * (listing.weightMt||0))).toLocaleString()}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                className="w-full h-12 text-base font-bold bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={!isAvailable || executeOrder.isPending}
                onClick={handleBuy}
              >
                {executeOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isAvailable ? "Secure Lot Now" : "Currently Unavailable"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
