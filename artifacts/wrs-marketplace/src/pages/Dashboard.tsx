import { useGetMe, useGetMarketSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { ActivityItemType } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetMarketSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ query: { limit: 5 } });

  if (userLoading || summaryLoading || activityLoading) {
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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
            {user?.tier} TIER
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="dashboard-volume">
                ${summary?.totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-listings">
                {summary?.totalActiveListings}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Price / MT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="dashboard-avg-price">
                {summary?.avgPricePerMt ? `$${summary.avgPricePerMt.toFixed(2)}` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1 border-t-4 border-t-accent">
            <CardHeader>
              <CardTitle>Recent Market Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors border">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none" data-testid={`activity-desc-${item.id}`}>
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                        {item.valueUsd && ` • $${item.valueUsd.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
                {!activity?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
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
                        (user?.reputationScore ?? 0) >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`} />
                      <p className="font-medium" data-testid="profile-reputation">{user?.reputationScore}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">KYB Status</p>
                    <p className="font-medium" data-testid="profile-kyb">{user?.kybStatus}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
