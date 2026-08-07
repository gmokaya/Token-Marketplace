import { useState } from "react";
import { useGetMe, useListCoffeeLots, useGetPlatformEarnings, getListCoffeeLotsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, DollarSign, Coffee, BarChart3, Info } from "lucide-react";
import { Link } from "wouter";

type Period = "7d" | "30d" | "90d" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CATALOGUED: "bg-slate-100 text-slate-800 border-slate-200",
  DISPATCHED: "bg-blue-100 text-blue-700 border-blue-200",
  LIVE: "bg-blue-100 text-blue-800 border-blue-200",
  SOLD: "bg-green-100 text-green-800 border-green-200",
  UNSOLD: "bg-zinc-100 text-zinc-600 border-zinc-200",
  WITHDRAWN: "bg-red-100 text-red-600 border-red-200",
  RESERVE_NOT_MET: "bg-red-50 text-red-700 border-red-200",
};

export default function BrokerEarnings() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: me } = useGetMe();
  const { data: earnings, isLoading: isLoadingEarnings } = useGetPlatformEarnings({ period });
  const { data: lots, isLoading: isLoadingLots } = useListCoffeeLots(
    { brokerId: me?.id } as any,
    { query: { enabled: !!me?.id, queryKey: getListCoffeeLotsQueryKey({ brokerId: me?.id } as any) } }
  );

  // Compute broker-level metrics from lots
  const soldLots = (lots ?? []).filter(l => l.status === "SOLD");
  const allLots = lots ?? [];
  const totalLotsMt = allLots.reduce((sum, l) => sum + (l.netWeightKg ?? 0) / 1000, 0);
  const soldLotsMt = soldLots.reduce((sum, l) => sum + (l.netWeightKg ?? 0) / 1000, 0);

  // Estimate commission: sum reserve prices × weight for SOLD lots (approximate)
  const estimatedCommission = soldLots.reduce((sum, l) => {
    const kg = (l.netWeightKg ?? 0);
    const rate = 0.01; // default 1% broker commission
    const value = (l.reservePriceUsd ?? 0) * kg;
    return sum + value * rate;
  }, 0);

  const isLoading = isLoadingEarnings || isLoadingLots;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/broker">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission & Earnings</h1>
          <p className="text-muted-foreground mt-1">Your brokerage performance and fee breakdown.</p>
        </div>
        <div className="ml-auto">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50/60 text-blue-800 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Commission figures are estimated from your brokered lot pipeline using the default 1% rate.
          Final settlement values depend on auction outcomes and mandate-specific overrides.
        </p>
      </div>

      {/* Broker metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-5">
              <div className="text-sm font-medium text-primary-foreground/70 mb-2">Est. Commission</div>
              <div className="text-2xl font-bold font-mono">${estimatedCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-primary-foreground/60 mt-1">from sold lots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Lots Sold</span>
                <Coffee className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold font-mono">{soldLots.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{soldLotsMt.toFixed(1)} MT cleared</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Brokered</span>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold font-mono">{allLots.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalLotsMt.toFixed(1)} MT total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Conversion</span>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold font-mono">
                {allLots.length > 0 ? Math.round((soldLots.length / allLots.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">lots → sold</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform earnings (period-scoped) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Activity — {PERIODS.find(p => p.value === period)?.label}</CardTitle>
          <CardDescription>
            Platform-wide fee totals across all brokers and transactions. This is not your personal commission — it reflects the overall marketplace health for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEarnings ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trading Fees</div>
                <div className="text-xl font-bold font-mono">${(earnings?.totalPlatformFeesUsd ?? 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Escrow Fees</div>
                <div className="text-xl font-bold font-mono">${(earnings?.totalEscrowFeesUsd ?? 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Settled Orders</div>
                <div className="text-xl font-bold font-mono">{earnings?.completedSettlementCount ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lot Fee Breakdown</CardTitle>
          <CardDescription>Per-lot commission estimate based on reserve price × weight × 1% default rate.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLots ? (
            <Skeleton className="h-48 w-full" />
          ) : allLots.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p>No brokered lots found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Lot</th>
                    <th className="pb-3 font-medium text-muted-foreground">Origin</th>
                    <th className="pb-3 font-medium text-muted-foreground">Grade</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Weight</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Est. Commission</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allLots.map(lot => {
                    const kg = lot.netWeightKg ?? 0;
                    const commission = (lot.reservePriceUsd ?? 0) * kg * 0.01;
                    return (
                      <tr key={lot.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{lot.gradeMark ?? `Lot #${lot.id}`}</td>
                        <td className="py-3 text-muted-foreground">{lot.giOrigin ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">{lot.grade ?? "—"}</td>
                        <td className="py-3 text-right font-mono">{(kg / 1000).toFixed(2)} MT</td>
                        <td className="py-3 text-right font-mono">
                          {lot.status === "SOLD"
                            ? <span className="text-emerald-600 font-bold">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            : <span className="text-muted-foreground">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })} est.</span>
                          }
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lot.status] ?? ""}`}>
                            {lot.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={4} className="pt-3 text-right text-muted-foreground pr-4">Total (SOLD only)</td>
                    <td className="pt-3 text-right font-mono text-emerald-600">
                      ${estimatedCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
