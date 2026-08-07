import { useGetMe, useGetMyMandates, useListCoffeeLots, useListCoffeeRfqs, useListCoffeeAuctionSessions, useGetPlatformEarnings, getListCoffeeLotsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ShieldCheck, Coffee, Gavel, TrendingUp, Plus, ArrowRight,
  Package, MessageSquare, DollarSign, Clock
} from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, accent = false }: {
  title: string; value: string | number; sub?: string; icon: any; accent?: boolean;
}) {
  return (
    <Card className={accent ? "bg-primary text-primary-foreground border-primary/20" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className={`text-sm font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{title}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-primary-foreground/10" : "bg-muted"}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`} />
          </div>
        </div>
        <div className={`text-2xl font-bold font-mono ${accent ? "text-primary-foreground" : ""}`}>{value}</div>
        {sub && <p className={`text-xs mt-1 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function BrokerDashboard() {
  const { data: me } = useGetMe();
  const { data: mandates, isLoading: isLoadingMandates } = useGetMyMandates();
  const { data: lots, isLoading: isLoadingLots } = useListCoffeeLots(
    { brokerId: me?.id } as any,
    { query: { enabled: !!me?.id, queryKey: getListCoffeeLotsQueryKey({ brokerId: me?.id } as any) } }
  );
  const { data: rfqs, isLoading: isLoadingRfqs } = useListCoffeeRfqs();
  const { data: sessions, isLoading: isLoadingSessions } = useListCoffeeAuctionSessions(
    { status: "SCHEDULED" as any },
    { query: { queryKey: ["coffee-auction-sessions", "SCHEDULED"] } }
  );
  const { data: earnings } = useGetPlatformEarnings({ period: "30d" });

  const activeMandates = (mandates ?? []).filter(m => !m.revoked && (!m.validTo || new Date(m.validTo) > new Date()));
  const pipelineLots = (lots ?? []).filter(l => ["DRAFT", "CATALOGUED", "DISPATCHED", "LIVE"].includes(l.status));
  const openRfqs = (rfqs ?? []).filter((r: any) => r.status === "OPEN");
  const upcomingSessions = (sessions ?? []).slice(0, 3);

  const isLoading = isLoadingMandates || isLoadingLots;

  if (!me) return null;

  return (
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
        <div className="flex gap-2">
          <Link href="/broker/lots/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Lot</Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Mandates" value={activeMandates.length} sub="authorised cooperatives" icon={ShieldCheck} accent />
          <StatCard title="Pipeline Lots" value={pipelineLots.length} sub="draft → live" icon={Coffee} />
          <StatCard title="Open RFQs" value={openRfqs.length} sub="awaiting response" icon={MessageSquare} />
          <StatCard
            title="Platform Fees (30d)"
            value={`$${(earnings?.totalPlatformFeesUsd ?? 0).toLocaleString()}`}
            sub="platform-wide"
            icon={DollarSign}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lot Pipeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Lot Pipeline</CardTitle>
                <CardDescription>Active lots under your brokerage</CardDescription>
              </div>
              <Link href="/broker/lots">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">All Lots <ArrowRight className="w-3 h-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingLots ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : pipelineLots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 border rounded-lg border-dashed border-border gap-2">
                  <Coffee className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No lots in pipeline</p>
                  <Link href="/broker/lots/new">
                    <Button variant="outline" size="sm" className="gap-1.5 mt-1"><Plus className="w-3 h-3" /> Create Lot</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {pipelineLots.slice(0, 6).map(lot => (
                    <div key={lot.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lot.gradeMark ?? `Lot #${lot.id}`}</p>
                          <p className="text-xs text-muted-foreground">{lot.giOrigin ?? "—"} · {lot.grade}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lot.netWeightKg != null && (
                          <span className="text-xs text-muted-foreground font-mono hidden sm:block">{(lot.netWeightKg / 1000).toFixed(1)} MT</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {lot.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {pipelineLots.length > 6 && (
                    <div className="pt-3 text-center">
                      <Link href="/broker/lots">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                          +{pipelineLots.length - 6} more lots
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: RFQs + Auctions */}
        <div className="space-y-6">
          {/* Open RFQs */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">RFQ Inbox</CardTitle>
                <CardDescription>Buyer quote requests</CardDescription>
              </div>
              {openRfqs.length > 0 && (
                <Badge className="bg-accent text-accent-foreground">{openRfqs.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingRfqs ? (
                <Skeleton className="h-20 w-full" />
              ) : openRfqs.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                  No open requests
                </div>
              ) : (
                <div className="space-y-2">
                  {openRfqs.slice(0, 4).map((rfq: any) => (
                    <div key={rfq.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">RFQ #{rfq.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {rfq.requestedQuantityKg ? `${(rfq.requestedQuantityKg / 1000).toFixed(1)} MT` : "—"} · {rfq.requestedPriceUsdPerKg ? `$${Number(rfq.requestedPriceUsdPerKg).toFixed(2)}/kg` : "open price"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">{rfq.status ?? "open"}</Badge>
                    </div>
                  ))}
                  {openRfqs.length > 4 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">+{openRfqs.length - 4} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Auctions */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Auctions</CardTitle>
                <CardDescription>Scheduled sessions</CardDescription>
              </div>
              <Link href="/broker/auctions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">View <ArrowRight className="w-3 h-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <Skeleton className="h-20 w-full" />
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                  No scheduled sessions
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.map((s: any) => (
                    <Link key={s.id} href={`/auction/${s.id}`}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-medium">Session #{s.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.startAt ? format(new Date(s.startAt), "MMM d · HH:mm") : "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{s.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/broker/lots/new">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <Coffee className="w-4 h-4" /> Create New Lot
                </Button>
              </Link>
              <Link href="/broker/mandates">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <ShieldCheck className="w-4 h-4" /> My Mandates
                </Button>
              </Link>
              <Link href="/broker/auctions">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <Gavel className="w-4 h-4" /> Auction Rooms
                </Button>
              </Link>
              <Link href="/broker/earnings">
                <Button variant="outline" className="w-full justify-start gap-2 h-9">
                  <TrendingUp className="w-4 h-4" /> Commission & Earnings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mandate Summary */}
      {activeMandates.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Active Mandates</CardTitle>
              <CardDescription>Cooperatives you are authorised to trade on behalf of</CardDescription>
            </div>
            <Link href="/broker/mandates">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">Manage <ArrowRight className="w-3 h-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeMandates.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.ownerName ?? `Producer #${m.ownerId}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.commodityType}
                      {m.commissionRateOverride != null && ` · ${(m.commissionRateOverride * 100).toFixed(1)}% commission`}
                    </p>
                    {m.validTo && (
                      <p className="text-xs text-muted-foreground">expires {format(new Date(m.validTo), "MMM d, yyyy")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
