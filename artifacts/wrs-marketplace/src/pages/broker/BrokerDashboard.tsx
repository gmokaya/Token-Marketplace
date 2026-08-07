import { useGetMe, useGetMarketSummary, useListAuctions, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Gavel, BarChart3, Package, TrendingUp } from "lucide-react";

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
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 6 });

  const isLoading = summaryLoading || auctionsLoading;

  if (!me) return <Layout><Skeleton className="h-64" /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broker Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {me.name?.split(" ")[0] ?? "Broker"}.
            {me.company && <span className="ml-1 text-accent font-medium">{me.company}</span>}
          </p>
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

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
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
    </Layout>
  );
}
