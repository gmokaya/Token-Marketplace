import { useGetMe, useGetMarketSummary, useGetRecentActivity, useGetMyPortfolio, useListOrders, useGetPlatformEarnings, useListAuctions, customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { formatTier } from "@/lib/formatTier";
import { Users, ShieldCheck, Gavel, DollarSign } from "lucide-react";

function ProducerDashboard() {
  const { data: user } = useGetMe();
  const { data: portfolio, isLoading: portfolioLoading } = useGetMyPortfolio();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();

  const activeListings = portfolio?.ewrs.filter(e => e.state === "MARKET_LISTED").length ?? 0;
  const lockedEwrs = portfolio?.ewrs.filter(e => e.state === "LOCK_TRADING").length ?? 0;
  const ingestedEwrs = portfolio?.ewrs.filter(e => e.state === "INGESTED").length ?? 0;

  return (
    <div className="space-y-8">
      <OnboardingBanner />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Producer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your eWR portfolio and active market listings</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
          {user?.company || "Producer"}
        </Badge>
      </div>

      {(portfolioLoading || summaryLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="dashboard-volume">
                ${portfolio?.totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{portfolio?.ewrs.length ?? 0} total receipts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ready to List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-listings">{ingestedEwrs}</div>
              <p className="text-xs text-muted-foreground mt-1">INGESTED eWRs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On Market</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{activeListings}</div>
              <p className="text-xs text-muted-foreground mt-1">Active listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trade Locked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-700">{lockedEwrs}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending settlement</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>eWR Portfolio</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/portfolio">View All</Link></Button>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-2">
                {portfolio?.ewrs.slice(0, 5).map(ewr => (
                  <div key={ewr.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50">
                    <div>
                      <p className="font-mono text-sm font-medium">{ewr.ewrsReceiptId}</p>
                      <p className="text-xs text-muted-foreground">{ewr.warehouseCode} · {ewr.weightMt} MT · Grade {ewr.grade}</p>
                    </div>
                    <Badge variant="secondary" className={
                      ewr.state === "MARKET_LISTED" ? "bg-blue-100 text-blue-800" :
                      ewr.state === "AUCTION_ACTIVE" ? "bg-sky-100 text-sky-800" :
                      ewr.state === "FORWARD_BOUND" ? "bg-lime-100 text-lime-800" :
                      ewr.state === "LOCK_TRADING" ? "bg-slate-100 text-slate-700" :
                      ewr.state === "INGESTED" ? "bg-green-100 text-green-800" :
                      ewr.state === "ENCUMBERED" ? "bg-slate-100 text-slate-700" : "bg-gray-100 text-gray-800"
                    }>
                      {ewr.state.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
                {!portfolio?.ewrs.length && <p className="text-sm text-muted-foreground text-center py-6">No eWRs in portfolio.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Market Overview</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/market-stats">Full Stats</Link></Button>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Market Volume</span>
                  <span className="font-semibold">${summary?.totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Listings</span>
                  <span className="font-semibold">{summary?.totalActiveListings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Price / MT</span>
                  <span className="font-semibold">{summary?.avgPricePerMt ? `$${summary.avgPricePerMt.toFixed(2)}` : "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Your Reputation Score</span>
                  <span className="font-semibold" data-testid="profile-reputation">{user?.reputationScore ?? "-"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OffTakerDashboard() {
  const { data: user } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();
  const { data: orders, isLoading: ordersLoading } = useListOrders({});
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 });

  const pendingOrders = orders?.filter(o => o.status === "PENDING_SETTLEMENT") ?? [];
  const settledOrders = orders?.filter(o => o.status === "SETTLED") ?? [];
  const totalSpend = settledOrders.reduce((sum, o) => sum + parseFloat(String(o.totalUsd ?? "0")), 0);

  return (
    <div className="space-y-8">
      <OnboardingBanner />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Browse spot listings and manage your purchase orders</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
          {user?.company || "Off-Taker"}
        </Badge>
      </div>

      {(summaryLoading || ordersLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="dashboard-listings">{summary?.totalActiveListings ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active on market</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-700">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting settlement</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settled Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{settledOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-volume">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Settled USD</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/orders">View All</Link></Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="space-y-2">
                {orders?.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{order.commodityType} · {order.weightMt} MT</p>
                      <p className="text-xs text-muted-foreground">${parseFloat(String(order.totalUsd ?? "0")).toLocaleString()} · {order.warehouseCode}</p>
                    </div>
                    <Badge variant="secondary" className={
                      order.status === "PENDING_SETTLEMENT" ? "bg-slate-100 text-slate-700" :
                      order.status === "SETTLED" ? "bg-green-100 text-green-800" :
                      order.status === "EXPIRED" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                    }>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
                {!orders?.length && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No orders yet.</p>
                    <Button asChild variant="link" className="mt-1"><Link href="/marketplace">Browse Listings →</Link></Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Market Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-3">
                {activity?.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium" data-testid={`activity-desc-${item.id}`}>{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {!activity?.length && <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MarketRisk {
  myEncumberedEwrs: Array<{
    id: number;
    ewrsReceiptId: string;
    commodityType: string;
    grade: string;
    weightMt: string | null;
    warehouseCode: string;
    estimatedValueUsd: string | null;
    ownerName: string | null;
  }>;
  totalLienValueUsd: number;
  myLienCount: number;
  pendingSettlementCount: number;
  pendingSettlementValueUsd: number;
  expiringSoonCount: number;
  atRiskBuyerCount: number;
}

function FinancierDashboard() {
  const { data: user } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 6 });
  const { data: risk, isLoading: riskLoading } = useQuery<MarketRisk>({
    queryKey: ["market-risk"],
    queryFn: () => customFetch<MarketRisk>("/api/stats/market-risk"),
    staleTime: 30_000,
  });

  const isLoading = summaryLoading || riskLoading;

  return (
    <div className="space-y-8">
      <OnboardingBanner />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financier Dashboard</h1>
          <p className="text-muted-foreground mt-1">Credit-risk exposure, lien portfolio & settlement risk</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
          {user?.company || "Financier"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">My Lien Portfolio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-blue-200 bg-blue-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Encumbered eWRs (My Liens)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700" data-testid="dashboard-lien-count">
                    {risk?.myLienCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">receipts under active lien</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Lien Exposure Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700" data-testid="dashboard-lien-value">
                    ${risk?.totalLienValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">estimated USD at risk</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Market Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">
                    ${summary?.totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">total traded on platform</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Settlement Risk</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={risk && risk.pendingSettlementCount > 0 ? "border-slate-200 bg-slate-50/40" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Settlement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${risk && risk.pendingSettlementCount > 0 ? "text-slate-700" : ""}`} data-testid="dashboard-pending-settlement">
                    {risk?.pendingSettlementCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${risk?.pendingSettlementValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "0"} at stake
                  </p>
                </CardContent>
              </Card>
              <Card className={risk && risk.expiringSoonCount > 0 ? "border-red-200 bg-red-50/40" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiring Within 1h</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${risk && risk.expiringSoonCount > 0 ? "text-red-700" : ""}`} data-testid="dashboard-expiring-soon">
                    {risk?.expiringSoonCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">lock windows closing soon</p>
                </CardContent>
              </Card>
              <Card className={risk && risk.atRiskBuyerCount > 0 ? "border-red-200 bg-red-50/40" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">At-Risk Buyers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${risk && risk.atRiskBuyerCount > 0 ? "text-red-700" : ""}`} data-testid="dashboard-at-risk-buyers">
                    {risk?.atRiskBuyerCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">reputation score &lt; 70</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Encumbered eWR Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {riskLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : risk?.myEncumberedEwrs.length ? (
              <div className="space-y-2">
                {risk.myEncumberedEwrs.map(ewr => (
                  <div key={ewr.id} className="flex items-center justify-between p-2 rounded border bg-blue-50/30 text-sm">
                    <div>
                      <span className="font-medium">{ewr.ewrsReceiptId}</span>
                      <span className="text-muted-foreground ml-2">{ewr.commodityType} · {ewr.grade} · {ewr.weightMt} MT</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-blue-700">
                        ${parseFloat(ewr.estimatedValueUsd ?? "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <div className="text-xs text-muted-foreground">{ewr.warehouseCode}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No encumbered eWRs in your lien portfolio.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Market Activity</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/market-stats">Full Stats</Link></Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-3">
                {activity?.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {!activity?.length && <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EnablerDashboard() {
  const { data: user } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 8 });

  return (
    <div className="space-y-8">
      <OnboardingBanner />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Operator Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor warehouse activity and market flow</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
          {user?.company || "Warehouse Operator"}
        </Badge>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Market Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="dashboard-volume">
                ${summary?.totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-listings">{summary?.totalActiveListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Price / MT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-avg-price">
                {summary?.avgPricePerMt ? `$${summary.avgPricePerMt.toFixed(2)}` : "-"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Market Activity</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/market-stats">Full Stats</Link></Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-3">
                {activity?.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium" data-testid={`activity-desc-${item.id}`}>{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {!activity?.length && <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium" data-testid="profile-company">{user?.company || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reputation Score</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      (user?.reputationScore ?? 0) >= 80 ? "bg-green-500" :
                       (user?.reputationScore ?? 0) >= 60 ? "bg-slate-500" : "bg-red-500"
                    }`} />
                    <p className="font-medium" data-testid="profile-reputation">{user?.reputationScore}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">KYB Status</p>
                  <p className="font-medium" data-testid="profile-kyb">{user?.kybStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">Warehouse Operator</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  tier: "PRODUCER" | "OFF_TAKER" | "ENABLER" | "FINANCIER" | "COOPERATIVE" | "ADMIN";
  kybStatus: "PENDING" | "APPROVED" | "REJECTED";
  reputationScore: string | number | null;
  createdAt: string;
};

const ADMIN_TIERS = ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER", "COOPERATIVE", "ADMIN"] as const;

const TIER_BADGE: Record<string, string> = {
  PRODUCER: "bg-green-100 text-green-800",
  OFF_TAKER: "bg-blue-100 text-blue-800",
  ENABLER: "bg-purple-100 text-purple-800",
  FINANCIER: "bg-slate-100 text-slate-700",
  COOPERATIVE: "bg-cyan-100 text-cyan-800",
  ADMIN: "bg-red-100 text-red-800",
};

const KYB_BADGE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

function AdminStatCard({ title, value, sub, icon: Icon, color = "text-primary" }: { title: string; value: string; sub?: string; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold truncate">{value}</p>
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SuperAdminDashboard() {
  const { data: user } = useGetMe();

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUserRow[]>({
    queryKey: ["admin-users", "ALL", ""],
    queryFn: () => customFetch<AdminUserRow[]>("/api/admin/users"),
    staleTime: 30_000,
  });

  const { data: earnings, isLoading: earningsLoading } = useGetPlatformEarnings({ period: "7d" });

  const { data: openAuctions = [], isLoading: auctionsLoading } = useListAuctions({ status: "OPEN" });

  const tierCounts = ADMIN_TIERS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = users.filter(u => u.tier === t).length;
    return acc;
  }, {});

  const kybCounts = {
    PENDING: users.filter(u => u.kybStatus === "PENDING").length,
    APPROVED: users.filter(u => u.kybStatus === "APPROVED").length,
    REJECTED: users.filter(u => u.kybStatus === "REJECTED").length,
  };
  const kybDecided = kybCounts.APPROVED + kybCounts.REJECTED;
  const approvalRate = kybDecided > 0 ? Math.round((kybCounts.APPROVED / kybDecided) * 100) : 0;

  const platformEarnings7d = earnings
    ? (earnings.totalPlatformFeesUsd ?? 0) + (earnings.totalEscrowFeesUsd ?? 0) + (earnings.financingFacilitationFeesUsd ?? 0)
    : 0;

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Platform-wide health, KYB funnel, and recent activity</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
          {user?.company || "Exchange Administrator"}
        </Badge>
      </div>

      {(usersLoading || earningsLoading || auctionsLoading) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <AdminStatCard
            title="Total Users"
            value={users.length.toLocaleString()}
            sub={`${tierCounts.PRODUCER} producers · ${tierCounts.OFF_TAKER} off-takers`}
            icon={Users}
          />
          <AdminStatCard
            title="KYB Approval Rate"
            value={`${approvalRate}%`}
            sub={`${kybCounts.PENDING} pending · ${kybCounts.APPROVED} approved · ${kybCounts.REJECTED} rejected`}
            icon={ShieldCheck}
            color="text-green-600"
          />
          <AdminStatCard
            title="Active Auctions"
            value={openAuctions.length.toLocaleString()}
            sub="Currently open for bidding"
            icon={Gavel}
            color="text-blue-500"
          />
          <AdminStatCard
            title="Platform Earnings (7d)"
            value={`$${platformEarnings7d.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub="Marketplace + escrow + financing fees"
            icon={DollarSign}
            color="text-primary"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Users by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-2">
                {ADMIN_TIERS.map(t => (
                  <div key={t} className="flex items-center justify-between text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_BADGE[t]}`}>
                      {formatTier(t)}
                    </span>
                    <span className="font-semibold tabular-nums">{tierCounts[t] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Sign-ups</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/admin/users">Manage Users</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">KYB</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Loading users…</td></tr>
                  )}
                  {!usersLoading && recentSignups.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No users yet</td></tr>
                  )}
                  {recentSignups.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_BADGE[u.tier]}`}>
                          {formatTier(u.tier)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${KYB_BADGE[u.kybStatus]}`}>
                          {u.kybStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users"><Button>Manage Users</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/earnings"><Button>View Earnings</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/audit"><Button>View Audit</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {user?.tier === "PRODUCER" && <ProducerDashboard />}
      {user?.tier === "OFF_TAKER" && <OffTakerDashboard />}
      {user?.tier === "ENABLER" && <EnablerDashboard />}
      {user?.tier === "FINANCIER" && <FinancierDashboard />}
      {user?.tier === "COOPERATIVE" && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Cooperative Dashboard</h1>
          <p className="text-muted-foreground">Redirecting to your cooperative workspace...</p>
          <Link href="/coop"><Button>Go to Coop Dashboard</Button></Link>
        </div>
      )}
      {user?.tier === "ADMIN" && <SuperAdminDashboard />}
      {!user?.tier && (
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      )}
    </Layout>
  );
}
