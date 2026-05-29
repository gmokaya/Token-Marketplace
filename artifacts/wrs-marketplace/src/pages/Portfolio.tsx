import { Layout } from "@/components/layout/Layout";
import { useGetMyPortfolio, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Portfolio() {
  const { data: portfolio, isLoading: portfolioLoading } = useGetMyPortfolio();
  const { data: user } = useGetMe();

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

  const getStateColor = (state: string) => {
    switch(state) {
      case "INGESTED": return "bg-green-100 text-green-800";
      case "MARKET_LISTED": return "bg-blue-100 text-blue-800";
      case "LOCK_TRADING": return "bg-amber-100 text-amber-800";
      case "SETTLED": return "bg-gray-100 text-gray-800";
      case "ENCUMBERED": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (user?.tier !== "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          You do not have access to the producer portfolio.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My eWR Portfolio</h1>
        
        {portfolioLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
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
            </div>

            <h2 className="text-xl font-bold mt-8">Receipts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio?.ewrs.map(ewr => (
                <Card key={ewr.id} className="flex flex-col">
                  <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div>
                      <CardTitle className="text-lg font-bold">{ewr.ewrsReceiptId}</CardTitle>
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
                          <span className="font-medium">${ewr.estimatedValueUsd.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-4">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="secondary" className={getStateColor(ewr.state)}>
                          {ewr.state.replace("_", " ")}
                        </Badge>
                      </div>
                      {ewr.commodityType === "AVOCADO" && ewr.expiryAt && (
                        <div className="mt-4 pt-2 border-t">
                          <div className="text-xs font-semibold text-red-600 flex justify-between">
                            <span>Expires:</span>
                            <span>{new Date(ewr.expiryAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {portfolio?.ewrs.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed">
                  No electronic warehouse receipts found in your portfolio.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}