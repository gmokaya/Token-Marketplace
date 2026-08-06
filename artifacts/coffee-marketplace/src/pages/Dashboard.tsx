import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetMe,
  useGetMarketSummary,
  useGetRecentActivity,
  useListEwrs,
  useListCoffeeLots,
  useListCoffeeRfqs,
  useListFinancingRequests,
  useGetMyMandates,
  useListCoffeeAuctionSessions,
  useListForwardContracts,
  useGetPlatformEarnings,
  useListAuctions,
  useListOrders,
  getListCoffeeLotsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowRight, BarChart4, Box, FileText, ArrowUpRight, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: me } = useGetMe();

  if (!me) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {me.name}</h1>
        <p className="text-muted-foreground mt-1">
          {me.company} &bull; {me.tier.replace("_", " ")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {me.tier === "PRODUCER"  && <ProducerStats />}
        {me.tier === "ENABLER"   && <BrokerStats />}
        {me.tier === "OFF_TAKER" && <TraderStats />}
        {me.tier === "ADMIN"     && <AdminStats />}
        {/* Fall back for tiers without a specific panel */}
        {!["PRODUCER","ENABLER","OFF_TAKER","ADMIN"].includes(me.tier) && <TraderStats />}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Live stats across all commodities</CardDescription>
            </div>
            <BarChart4 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <MarketOverview />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Role-specific stat panels — all backed by live API data
// ─────────────────────────────────────────────────────────────────

function ProducerStats() {
  const { data: ewrs,       isLoading: l1 } = useListEwrs({ commodityType: "COFFEE" } as any);
  const { data: lots,       isLoading: l2 } = useListCoffeeLots();
  const { data: rfqs,       isLoading: l3 } = useListCoffeeRfqs();
  const { data: financings, isLoading: l4 } = useListFinancingRequests();

  const ewrCount      = ewrs?.length ?? 0;
  // DRAFT / CATALOGUED / DISPATCHED / LIVE are the pipeline statuses for CoffeeLot
  const activeLots    = (lots ?? []).filter((l: { status: string }) => ["DRAFT","CATALOGUED","DISPATCHED","LIVE"].includes(l.status)).length;
  const openRfqs      = (rfqs as { status: string }[] ?? []).filter((r) => r.status === "OPEN").length;
  const pendingFinanc = (financings ?? []).filter((f: { status: string }) => f.status === "PENDING").length;

  const loading = l1 || l2 || l3 || l4;

  return (
    <>
      <StatCard title="My eWRs" value={loading ? null : String(ewrCount)}
        desc="Active in warehouse" icon={Box} link="/producer/ewrs" />
      <StatCard title="Lots Pipeline" value={loading ? null : String(activeLots)}
        desc="Pending and Live" icon={FileText} link="/producer/products" />
      <StatCard title="Open RFQs" value={loading ? null : String(openRfqs)}
        desc="Require response" icon={ArrowRight} link="/producer/rfqs" />
      <StatCard title="Pending Financing" value={loading ? null : String(pendingFinanc)}
        desc="Awaiting decision" icon={TrendingUp} link="/financing" />
    </>
  );
}

function BrokerStats() {
  const { data: me }                       = useGetMe();
  const { data: mandates, isLoading: l1 } = useGetMyMandates();
  const { data: lots,     isLoading: l2 } = useListCoffeeLots(
    { brokerId: me?.id } as any,
    { query: { enabled: !!me?.id, queryKey: getListCoffeeLotsQueryKey({ brokerId: me?.id } as any) } }
  );
  const { data: sessions, isLoading: l3 } = useListCoffeeAuctionSessions();

  const activeMandates = (mandates ?? []).filter((m: { revoked: boolean; validTo?: string | null }) =>
    !m.revoked && (!m.validTo || new Date(m.validTo) > new Date())
  ).length;
  const brokeredLots  = (lots ?? []).filter((l: { status: string }) => ["DRAFT","CATALOGUED","DISPATCHED","LIVE"].includes(l.status)).length;
  const upcomingSessions = (sessions ?? []).filter((s: { status: string }) =>
    ["SCHEDULED","LIVE"].includes(s.status)
  ).length;

  const loading = l1 || l2 || l3;

  return (
    <>
      <StatCard title="Active Mandates" value={loading ? null : String(activeMandates)}
        desc="Cooperatives" icon={Box} link="/broker/mandates" />
      <StatCard title="Brokered Lots" value={loading ? null : String(brokeredLots)}
        desc="Currently listed" icon={FileText} link="/broker/lots" />
      <StatCard title="Upcoming Auctions" value={loading ? null : String(upcomingSessions)}
        desc="Scheduled or live" icon={TrendingUp} link="/broker/auctions" />
      <StatCard title="My Mandates" value={loading ? null : String(activeMandates)}
        desc="Active authorisations" icon={ArrowRight} link="/broker/mandates" />
    </>
  );
}

function TraderStats() {
  const { data: auctions,  isLoading: l1 } = useListAuctions();
  const { data: orders,    isLoading: l2 } = useListOrders();
  const { data: forwards,  isLoading: l3 } = useListForwardContracts();
  const { data: market,    isLoading: l4 } = useGetMarketSummary();

  const liveAuctions   = (auctions ?? []).filter((a: { status: string }) => a.status === "OPEN").length;
  const settledOrders  = (orders ?? []).filter((o: { status: string }) => o.status === "CONFIRMED").length;
  const activeForwards = (forwards ?? []).filter((f: { contractStatus: string }) =>
    ["ACTIVE","PENDING_BUYER_COSIGN"].includes(f.contractStatus)
  ).length;
  const totalListings  = market?.totalActiveListings ?? 0;

  const loading = l1 || l2 || l3 || l4;

  return (
    <>
      <StatCard title="Live Auctions" value={loading ? null : String(liveAuctions)}
        desc="Open for bidding" icon={TrendingUp} link="/market" />
      <StatCard title="Settled Orders" value={loading ? null : String(settledOrders)}
        desc="Confirmed purchases" icon={Box} link="/dashboard" />
      <StatCard title="Forward Contracts" value={loading ? null : String(activeForwards)}
        desc="Active or pending sign" icon={FileText} link="/forwards" />
      <StatCard title="Market Listings" value={loading ? null : String(totalListings)}
        desc="Available COFFEE" icon={ArrowRight} link="/market" />
    </>
  );
}

function AdminStats() {
  const { data: earnings,  isLoading: l1 } = useGetPlatformEarnings();
  const { data: auctions,  isLoading: l2 } = useListAuctions();
  const { data: ewrs,      isLoading: l3 } = useListEwrs();
  const { data: financing, isLoading: l4 } = useListFinancingRequests();

  const totalEarnings  = earnings?.totalPlatformFeesUsd ?? 0;
  const liveAuctions   = (auctions ?? []).filter((a: { status: string }) => a.status === "OPEN").length;
  const pendingFinanc  = (financing ?? []).filter((f: { status: string }) => f.status === "PENDING").length;
  const ewrCount       = ewrs?.length ?? 0;

  const loading = l1 || l2 || l3 || l4;

  return (
    <>
      <StatCard
        title="Platform Earnings"
        value={loading ? null : `$${(totalEarnings / 1000).toFixed(1)}k`}
        desc="Total fees to date"
        icon={TrendingUp}
        link="/admin/earnings"
      />
      <StatCard title="Live Auctions" value={loading ? null : String(liveAuctions)}
        desc="Running now" icon={BarChart4} link="/admin/auctions" />
      <StatCard title="Pending Financing" value={loading ? null : String(pendingFinanc)}
        desc="Requires review" icon={FileText} link="/financing" />
      <StatCard title="Total eWRs" value={loading ? null : String(ewrCount)}
        desc="Ingested on platform" icon={Box} link="/admin" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, desc, icon: Icon, link,
}: {
  title: string;
  value: string | null;
  desc: string;
  icon: React.ElementType;
  link: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <div className="h-8 flex items-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-2xl font-mono font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        <div className="mt-4">
          <Link href={link}>
            <Button variant="link" className="px-0 h-auto text-xs text-accent hover:text-accent/80 flex items-center gap-1">
              View Details <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketOverview() {
  const { data, isLoading } = useGetMarketSummary();

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
      <div>
        <div className="text-sm text-muted-foreground mb-1">Total Volume</div>
        <div className="text-3xl font-mono text-foreground">${(data?.totalVolumeUsd || 0).toLocaleString()}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-1">Active Listings</div>
        <div className="text-3xl font-mono text-foreground">{data?.totalActiveListings || 0}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-1">Avg Price / MT</div>
        <div className="text-3xl font-mono text-foreground">${(data?.avgPricePerMt || 0).toLocaleString()}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-1">Ingested eWRs</div>
        <div className="text-3xl font-mono text-foreground">{data?.totalEwrsIngested || 0}</div>
      </div>
    </div>
  );
}

function RecentActivity() {
  const { data, isLoading } = useGetRecentActivity({ limit: 5 });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-6">No recent activity</div>;
  }

  return (
    <div className="space-y-6 pt-2">
      {data.map((item: { id: number; type: string; description: string; createdAt: string }) => (
        <div key={item.id} className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {item.type.includes("ORDER")
              ? <TrendingUp className="w-4 h-4 text-secondary-foreground" />
              : <Box className="w-4 h-4 text-secondary-foreground" />}
          </div>
          <div>
            <p className="text-sm text-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.createdAt), 'MMM d, h:mm a')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
