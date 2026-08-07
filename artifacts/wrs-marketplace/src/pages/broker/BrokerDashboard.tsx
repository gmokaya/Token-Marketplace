import { useGetMe, useGetMarketSummary, useListAuctions, useGetRecentActivity, useListSpotListings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Gavel, BarChart3, Package, TrendingUp, Plus, ArrowRight, Wheat } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon }: {
  title: string; value: string | number; sub?: string; icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {sub && <p className="text-xs mt-1 text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function BrokerDashboard() {
  const { data: me } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();
  const { data: openAuctions, isLoading: auctionsLoading } = useListAuctions({ status: "OPEN" as any });
  const { data: myListings, isLoading: listingsLoading } = useListSpotListings({});
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 6 });

  const activeListings = (myListings ?? []).filter((l: any) => l.status === "ACTIVE");
  const isLoading = summaryLoading || auctionsLoading || listingsLoading;

  if (!me) return <Layout><Skeleton className="h-64" /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Broker Overview</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {me.name?.split(" ")[0] ?? "Broker"}.
              {me.company && <span className="ml-1 text-accent font-medium">{me.company}</span>}
            </p>
          </div>
          <Link href="/intake">
            <Button className="gap-2"><Plus className="w-4 h-4" /> WMS Intake</Button>
          </Link>
        </div>

        {/* KPI Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Market Volume"
              value={`$${(summary?.totalVolumeUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Total traded USD"
              icon={TrendingUp}
            />
            <StatCard
              title="Active Listings"
              value={summary?.totalActiveListings ?? 0}
              sub="On spot market"
              icon={Package}
            />
            <StatCard
              title="Open Auctions"
              value={(openAuctions ?? []).length}
              sub="Currently live"
              icon={Gavel}
            />
            <StatCard
              title="Avg Price / MT"
              value={summary?.avgPricePerMt ? `$${summary.avgPricePerMt.toFixed(2)}` : "—"}
              sub="Spot market avg"
              icon={BarChart3}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common broker tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/intake">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <Wheat className="w-4 h-4" /> WMS Intake
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <Package className="w-4 h-4" /> My eWR Portfolio
                </Button>
              </Link>
              <Link href="/auctions">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <Gavel className="w-4 h-4" /> Browse Auctions
                </Button>
              </Link>
              <Link href="/market-stats">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <BarChart3 className="w-4 h-4" /> Market Statistics
                </Button>
              </Link>
              <Link href="/forwards">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <TrendingUp className="w-4 h-4" /> Forward Contracts
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest platform events</CardDescription>
              </div>
              <Link href="/market-stats">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Stats <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (activity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {(activity ?? []).map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 p-2 rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active My Listings */}
        {activeListings.length > 0 && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">My Active Listings</CardTitle>
                <CardDescription>Lots you currently have on the spot market</CardDescription>
              </div>
              <Link href="/my-listings">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeListings.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-sm">
                    <div>
                      <span className="font-medium">{l.commodityType}</span>
                      <span className="text-muted-foreground ml-2">
                        {l.warehouseCode} · {parseFloat(l.weightMt ?? "0").toFixed(1)} MT · Grade {l.grade}
                      </span>
                    </div>
                    <span className="font-mono font-semibold">
                      ${parseFloat(l.pricePerMtUsd ?? "0").toLocaleString()}/MT
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
