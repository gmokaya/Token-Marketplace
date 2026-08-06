import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useGetPlatformEarnings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Percent, Layers, ShieldCheck } from "lucide-react";

type Period = "7d" | "30d" | "90d" | "all";

function StatCard({ title, value, sub, icon: Icon, color = "text-foreground" }: { title: string; value: string; sub?: string; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm font-medium text-foreground/80">{title}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminEarnings() {
  const [period, setPeriod] = useState<Period>("30d");

  const { data: earnings, isLoading } = useGetPlatformEarnings(
    { period },
    { query: { refetchInterval: 15000 } as any }
  );

  const totalRevenue = earnings
    ? (earnings.totalPlatformFeesUsd ?? 0) + (earnings.totalEscrowFeesUsd ?? 0) + (earnings.financingFacilitationFeesUsd ?? 0)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Earnings</h1>
            <p className="text-muted-foreground mt-1">Revenue from marketplace fees, escrow, and financing facilitation</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/audit">
              <a className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ShieldCheck className="w-4 h-4" /> Audit Log →
              </a>
            </Link>
            <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="7d">7 days</TabsTrigger>
                <TabsTrigger value="30d">30 days</TabsTrigger>
                <TabsTrigger value="90d">90 days</TabsTrigger>
                <TabsTrigger value="all">All time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : earnings ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub="All fee sources combined"
                icon={TrendingUp}
                color="text-primary"
              />
              <StatCard
                title="Marketplace Fees"
                value={`$${(earnings.totalPlatformFeesUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub="2% on settlement splits"
                icon={Percent}
                color="text-blue-500"
              />
              <StatCard
                title="Escrow Fees"
                value={`$${(earnings.totalEscrowFeesUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                sub="0.5% on spot orders"
                icon={DollarSign}
                color="text-slate-500"
              />
              <StatCard
                title="Financing Facilitation"
                value={`$${(earnings.financingFacilitationFeesUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}`}
                sub="0.5% of bank interest processed"
                icon={Layers}
                color="text-green-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Settlements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total initiated</span>
                    <span className="font-bold">{earnings.settlementCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fully completed</span>
                    <span className="font-bold text-green-600">{earnings.completedSettlementCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion rate</span>
                    <span className="font-bold">
                      {earnings.settlementCount > 0
                        ? ((earnings.completedSettlementCount / earnings.settlementCount) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Spot Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settled orders</span>
                    <span className="font-bold">{earnings.settledOrderCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow collected</span>
                    <span className="font-bold">${(earnings.totalEscrowFeesUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Financing Volume</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank repayments</span>
                    <span className="font-bold">${(earnings.totalBankRepaymentsUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facilitation (0.5%)</span>
                    <span className="font-bold text-green-700">${(earnings.financingFacilitationFeesUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-12">No earnings data available.</p>
        )}
      </div>
    </Layout>
  );
}
