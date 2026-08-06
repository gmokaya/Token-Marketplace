import { useListSpotListings, useGetPriceTrends, useGetCommodityBreakdown, useGetMarketSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, SlidersHorizontal, ArrowUpRight, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function Market() {
  const { data: listings, isLoading: isLoadingListings } = useListSpotListings({ commodityType: "COFFEE", status: "ACTIVE" } as any);
  const { data: summary, isLoading: isLoadingSummary } = useGetMarketSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spot Market</h1>
          <p className="text-muted-foreground mt-1">Discover and secure premium green coffee directly from origin.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search origins, grades..." className="pl-9" />
          </div>
          <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Market Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-primary-border shadow-md">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-sm font-medium text-primary-foreground/80 mb-1">Index Price</div>
            <div className="text-2xl font-mono font-bold flex items-center gap-2">
              ${(summary?.avgPricePerMt || 0).toLocaleString()} 
              <span className="text-xs font-sans text-emerald-400 flex items-center bg-emerald-400/10 px-1.5 py-0.5 rounded-sm">
                <TrendingUp className="w-3 h-3 mr-1" /> +2.4%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">Active Listings</div>
            <div className="text-2xl font-mono font-bold">{summary?.totalActiveListings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">24H Volume</div>
            <div className="text-2xl font-mono font-bold">${(summary?.totalVolumeUsd || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-sm font-medium text-muted-foreground mb-1">Available eWRs</div>
            <div className="text-2xl font-mono font-bold">{summary?.totalEwrs || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Listings Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Live Offers</h2>
        {isLoadingListings ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <h3 className="text-lg font-medium">No active listings</h3>
            <p className="text-muted-foreground mt-1">Check back later for new coffee lots.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: any }) {
  // We use standard SpotListing type fields. We might need to fetch the underlying Lot or EWR to get cupping score,
  // but for the UI we'll use what's available or mock presentation if fields are missing on SpotListing directly.
  return (
    <Card className="hover-elevate transition-all flex flex-col group overflow-hidden">
      <div className="h-2 w-full bg-gradient-to-r from-accent/50 to-accent" />
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
            {listing.grade || "SPECIALTY"}
          </Badge>
          <div className="text-xl font-mono font-bold">${listing.pricePerMt} <span className="text-xs text-muted-foreground font-sans font-normal">/ MT</span></div>
        </div>
        <CardTitle className="group-hover:text-accent transition-colors leading-tight">
          {listing.commodityType || "Coffee"} Lot #{listing.ewrId}
        </CardTitle>
        <CardDescription className="text-xs">Seller: {listing.sellerName}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg border border-border/50">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Weight</div>
            <div className="font-mono font-medium">{listing.weightMt} MT</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Warehouse</div>
            <div className="font-medium truncate" title={listing.warehouseCode}>{listing.warehouseCode}</div>
          </div>
        </div>
      </CardContent>
      <div className="p-4 pt-0 mt-auto">
        <Link href={`/lots/${listing.id}`}>
          <Button className="w-full gap-2 group-hover:bg-accent/90 transition-colors">
            View Details <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
