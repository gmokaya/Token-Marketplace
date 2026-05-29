import { useGetMe, useListSpotListings, useCancelSpotListing, getListSpotListingsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getGetMyPortfolioQueryKey } from "@workspace/api-client-react";

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE": return "bg-green-100 text-green-800";
    case "LOCKED": return "bg-amber-100 text-amber-800";
    case "SETTLED": return "bg-blue-100 text-blue-800";
    case "CANCELLED": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function MyListings() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();

  const { data: allListings, isLoading } = useListSpotListings({ status: undefined } as any);
  const cancelListing = useCancelSpotListing();
  const [cancelId, setCancelId] = useState<number | null>(null);

  if (user && user.tier !== "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          Only Producers can create and manage listings.
        </div>
      </Layout>
    );
  }

  const myListings = allListings?.filter(l => l.sellerId === user?.id) ?? [];

  const handleCancel = () => {
    if (!cancelId) return;
    cancelListing.mutate(
      { listingId: cancelId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSpotListingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyPortfolioQueryKey() });
          setCancelId(null);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Active Listings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your spot market listings. Go to <Link href="/portfolio" className="text-primary underline">Portfolio</Link> to list an eWR.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/portfolio">+ List an eWR</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : myListings.length === 0 ? (
          <div className="py-16 text-center border border-dashed rounded-lg text-muted-foreground space-y-3">
            <p className="text-base font-medium">No listings yet.</p>
            <p className="text-sm">Go to your Portfolio and select an INGESTED eWR to list on the spot market.</p>
            <Button asChild className="mt-2"><Link href="/portfolio">Go to Portfolio</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map(listing => (
              <Card key={listing.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCommodityColor(listing.commodityType || "")}>
                      {listing.commodityType}
                    </Badge>
                    <Badge variant="secondary" className={getStatusColor(listing.status)}>
                      {listing.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{listing.weightMt} MT · Grade {listing.grade}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price / MT</span>
                      <span className="font-bold text-primary">${listing.pricePerMt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">${listing.totalValueUsd?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warehouse</span>
                      <span className="font-medium">{listing.warehouseCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Season</span>
                      <span className="font-medium">{listing.harvestSeason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="font-medium">${listing.platformFeeUsd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/marketplace/${listing.id}`}>View</Link>
                  </Button>
                  {listing.status === "ACTIVE" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setCancelId(listing.id)}
                      data-testid={`button-cancel-listing-${listing.id}`}
                    >
                      Cancel
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={cancelId !== null} onOpenChange={v => { if (!v) setCancelId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Listing</DialogTitle>
            <DialogDescription>
              This will remove the listing from the marketplace and return the eWR to INGESTED state. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={cancelListing.isPending}>Keep Listing</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelListing.isPending} data-testid="button-confirm-cancel">
              {cancelListing.isPending ? "Cancelling…" : "Yes, Cancel Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
