import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetMe, useGetMarketSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowRight, BarChart4, Box, FileText, ArrowUpRight, TrendingUp } from "lucide-react";
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
        {/* Render specific stat cards based on role */}
        {me.tier === "PRODUCER" && <ProducerStats />}
        {me.tier === "ENABLER" && <BrokerStats />}
        {me.tier === "OFF_TAKER" && <TraderStats />}
        {me.tier === "ADMIN" && <AdminStats />}
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

// ----------------------------------------------------------------------
// Role specific stat cards
// ----------------------------------------------------------------------

function ProducerStats() {
  return (
    <>
      <StatCard title="My eWRs" value="12" desc="Active in warehouse" icon={Box} link="/producer/ewrs" />
      <StatCard title="Lots Pipeline" value="5" desc="Pending and Live" icon={FileText} link="/producer/products" />
      <StatCard title="Pending RFQs" value="2" desc="Requires response" icon={ArrowRight} link="/producer/rfqs" />
      <StatCard title="Settlements" value="$42,500" desc="Last 30 days" icon={TrendingUp} link="/producer" />
    </>
  );
}

function BrokerStats() {
  return (
    <>
      <StatCard title="Active Mandates" value="8" desc="Cooperatives" icon={Box} link="/broker/mandates" />
      <StatCard title="Brokered Lots" value="24" desc="Currently listed" icon={FileText} link="/broker" />
      <StatCard title="Upcoming Auctions" value="3" desc="Next 7 days" icon={TrendingUp} link="/broker/auctions" />
      <StatCard title="Escrow Volume" value="$128k" desc="Pending clearance" icon={ArrowRight} link="/broker" />
    </>
  );
}

function TraderStats() {
  return (
    <>
      <StatCard title="Active Bids" value="4" desc="In live auctions" icon={TrendingUp} link="/market" />
      <StatCard title="Settled Orders" value="15" desc="Last 30 days" icon={Box} link="/dashboard" />
      <StatCard title="Forward Contracts" value="2" desc="Awaiting delivery" icon={FileText} link="/forwards" />
      <StatCard title="Market Listings" value="342" desc="Available COFFEE" icon={ArrowRight} link="/market" />
    </>
  );
}

function AdminStats() {
  return (
    <>
      <StatCard title="Platform Earnings" value="$14,250" desc="Last 30 days" icon={TrendingUp} link="/admin/earnings" />
      <StatCard title="Live Auctions" value="2" desc="Running now" icon={BarChart4} link="/admin/auctions" />
      <StatCard title="KYB Pending" value="12" desc="Requires review" icon={FileText} link="/admin" />
      <StatCard title="Total Users" value="1,402" desc="Across all tiers" icon={Box} link="/admin" />
    </>
  );
}

// ----------------------------------------------------------------------
// Shared Components
// ----------------------------------------------------------------------

function StatCard({ title, value, desc, icon: Icon, link }: { title: string, value: string, desc: string, icon: any, link: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-mono font-bold">{value}</div>
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
      {data.map((item) => (
        <div key={item.id} className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {item.type.includes("ORDER") ? <TrendingUp className="w-4 h-4 text-secondary-foreground" /> : <Box className="w-4 h-4 text-secondary-foreground" />}
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
