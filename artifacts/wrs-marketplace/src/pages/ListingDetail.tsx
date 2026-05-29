import { useParams, useLocation } from "wouter";
import {
  useGetSpotListing,
  useGetMe,
  useExecuteOrder,
  getListSpotListingsQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ListingDetail() {
  const params = useParams();
  const listingId = parseInt(params.listingId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useGetMe();
  const { data: detail, isLoading } = useGetSpotListing(listingId, {
    query: { enabled: !!listingId, queryKey: ["/api/listings", listingId] }
  });

  const executeOrder = useExecuteOrder();

  const handleExecute = () => {
    executeOrder.mutate({ data: { listingId } }, {
      onSuccess: () => {
        toast({ title: "Order Executed", description: "Your buy order has been placed successfully." });
        queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
        setLocation("/orders");
      },
      onError: (err: any) => {
        toast({ title: "Failed to execute order", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </Layout>
    );
  }

  if (!detail) {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">Listing not found</div>
      </Layout>
    );
  }

  const { listing, ewr } = detail;
  const platformFee = (listing.totalValueUsd || 0) * 0.02;
  const escrowFee = (listing.totalValueUsd || 0) * 0.005;
  const totalCost = (listing.totalValueUsd || 0) + platformFee + escrowFee;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Listing Details</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Commodity & eWR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-muted-foreground">eWR ID</div>
                <div className="font-mono">{ewr.ewrsReceiptId}</div>
                
                <div className="text-muted-foreground">Commodity</div>
                <div className="font-medium">{ewr.commodityType}</div>
                
                <div className="text-muted-foreground">Grade</div>
                <div className="font-medium">{ewr.grade}</div>
                
                <div className="text-muted-foreground">Weight</div>
                <div className="font-medium">{ewr.weightMt} MT</div>
                
                <div className="text-muted-foreground">Warehouse</div>
                <div className="font-medium">{ewr.warehouseCode}</div>
                
                <div className="text-muted-foreground">Season</div>
                <div className="font-medium">{ewr.harvestSeason}</div>
                
                {ewr.moisturePct && (
                  <>
                    <div className="text-muted-foreground">Moisture</div>
                    <div className="font-medium">{ewr.moisturePct}%</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-muted/20 border-primary/20">
            <CardHeader>
              <CardTitle>Pricing & Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">Price per MT</span>
                  <span className="font-bold">${listing.pricePerMt.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({listing.weightMt} MT)</span>
                  <span>${listing.totalValueUsd?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (2%)</span>
                  <span>${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escrow Fee (0.5%)</span>
                  <span>${escrowFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Total Due</span>
                  <span>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {user?.tier === "OFF_TAKER" && listing.status === "ACTIVE" ? (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleExecute} 
                  disabled={executeOrder.isPending}
                  data-testid="button-execute-order"
                >
                  {executeOrder.isPending ? "Processing..." : "Execute Buy Order"}
                </Button>
              ) : (
                <div className="w-full text-center text-sm text-muted-foreground border p-3 rounded-md bg-muted">
                  {listing.status !== "ACTIVE" ? `Listing is ${listing.status}` : "You must be an Off-Taker to buy"}
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}