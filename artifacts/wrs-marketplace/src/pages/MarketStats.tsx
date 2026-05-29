import { Layout } from "@/components/layout/Layout";
import { useGetCommodityBreakdown, useGetWarehouseDistribution } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketStats() {
  const { data: commodityBreakdown, isLoading: cLoading } = useGetCommodityBreakdown();
  const { data: warehouseDist, isLoading: wLoading } = useGetWarehouseDistribution();

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Market Analytics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Commodity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {cLoading ? <Skeleton className="h-64" /> : (
                <div className="space-y-4">
                  {commodityBreakdown?.map(c => (
                    <div key={c.commodityType} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <span className="font-medium">{c.commodityType}</span>
                        <div className="text-xs text-muted-foreground">{c.activeListings} Active Listings</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{c.totalWeightMt} MT</div>
                        <div className="text-xs text-muted-foreground">${c.avgPricePerMt?.toLocaleString() ?? 0} / MT avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warehouse Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {wLoading ? <Skeleton className="h-64" /> : (
                <div className="space-y-4">
                  {warehouseDist?.map(w => (
                    <div key={w.warehouseCode} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <span className="font-medium">{w.warehouseCode}</span>
                        <div className="text-xs text-muted-foreground">{w.activeCommodities?.join(", ")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{w.ewrCount} eWRs</div>
                        <div className="text-xs text-muted-foreground">{w.totalWeightMt} MT total</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}