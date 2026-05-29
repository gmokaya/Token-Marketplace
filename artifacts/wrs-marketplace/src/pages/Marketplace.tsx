import { useState } from "react";
import { useGetMe, useListSpotListings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Marketplace() {
  const { data: user } = useGetMe();
  const [commodityFilter, setCommodityFilter] = useState<string>("ALL");
  
  const { data: listings, isLoading } = useListSpotListings({ 
    query: { 
      // @ts-ignore
      commodityType: commodityFilter === "ALL" ? undefined : commodityFilter,
      status: "ACTIVE"
    } 
  });

  const getCommodityColor = (type: string) => {
    switch(type) {
      case "MAIZE": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
      case "RICE": return "bg-teal-500/20 text-teal-700 border-teal-500/50";
      case "COFFEE": return "bg-amber-800/20 text-amber-900 border-amber-800/50";
      case "TEA": return "bg-green-600/20 text-green-800 border-green-600/50";
      case "AVOCADO": return "bg-emerald-500/20 text-emerald-700 border-emerald-500/50";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (user?.tier === "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          Producers cannot buy on the marketplace. Please view your portfolio.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Spot Marketplace</h1>
          <div className="flex gap-2">
            <Select value={commodityFilter} onValueChange={setCommodityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Commodities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Commodities</SelectItem>
                <SelectItem value="MAIZE">Maize</SelectItem>
                <SelectItem value="RICE">Rice</SelectItem>
                <SelectItem value="COFFEE">Coffee</SelectItem>
                <SelectItem value="TEA">Tea</SelectItem>
                <SelectItem value="AVOCADO">Avocado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings?.map((listing) => (
              <Card key={listing.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCommodityColor(listing.commodityType || "")}>
                      {listing.commodityType}
                    </Badge>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">${listing.pricePerMt}/MT</div>
                      <div className="text-xs text-muted-foreground">Total: ${listing.totalValueUsd?.toLocaleString()}</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{listing.weightMt} MT • Grade {listing.grade}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seller</span>
                      <span className="font-medium truncate max-w-[120px]">{listing.sellerName || `ID: ${listing.sellerId}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warehouse</span>
                      <span className="font-medium">{listing.warehouseCode}</span>
                    </div>
                    {listing.moisturePct && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moisture</span>
                        <span className="font-medium">{listing.moisturePct}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Season</span>
                      <span className="font-medium">{listing.harvestSeason}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline" data-testid={`button-view-listing-${listing.id}`}>
                    <Link href={`/marketplace/${listing.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {listings?.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed text-muted-foreground">
                No active listings match your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}