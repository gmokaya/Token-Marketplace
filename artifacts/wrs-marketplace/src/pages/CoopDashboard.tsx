import { Layout } from "@/components/layout/Layout";
import { useGetMe, useListIntakeLogs, useListMacroLots, useListEwrs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Package, Wheat, ArrowRight, Users, ClipboardList, Layers, BarChart3 } from "lucide-react";

const ACCENT = "hsl(180 62% 10%)";

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg" style={{ background: "hsl(180 62% 10% / 0.08)" }}>
          <Icon className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoopDashboard() {
  const { data: me } = useGetMe();
  const { data: intakeLogs, isLoading: loadingLogs } = useListIntakeLogs();
  const { data: macroLots, isLoading: loadingLots } = useListMacroLots();
  const { data: ewrs, isLoading: loadingEwrs } = useListEwrs(
    me?.id ? { ownerId: me.id } : {},
    { query: { enabled: !!me?.id } as any }
  );

  const totalIntakeWeight = (intakeLogs ?? []).reduce((s, l) => s + parseFloat(String(l.weightMt ?? 0)), 0);
  const openLots = (macroLots ?? []).filter(l => l.status === "OPEN").length;
  const finalisedLots = (macroLots ?? []).filter(l => l.status === "FINALISED").length;
  const issuedEwrs = (ewrs ?? []).filter(e => e.state === "INGESTED" || e.state === "ENCUMBERED").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cooperative Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Factory-gate stock overview and verified e-WR inventory.</p>
        </div>

        {loadingLogs || loadingLots || loadingEwrs ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Intake (MT)" value={totalIntakeWeight.toFixed(1)} sub="All deliveries logged" icon={Wheat} />
            <StatCard label="Open Macro Lots" value={openLots} sub="Accepting intake" icon={Layers} />
            <StatCard label="Finalised Lots" value={finalisedLots} sub="Awaiting eWR" icon={ClipboardList} />
            <StatCard label="Active e-WRs" value={issuedEwrs} sub="Tradeable inventory" icon={Package} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wheat className="w-4 h-4" style={{ color: ACCENT }} />
                Factory-Gate Intake
              </CardTitle>
              <Link href="/coop/intake">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingLogs ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)
              ) : (intakeLogs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No intake logged yet.</p>
              ) : (
                (intakeLogs ?? []).slice(-5).reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{log.commodityType} - {log.grade}</p>
                      <p className="text-xs text-muted-foreground">{log.memberRef}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{parseFloat(String(log.weightMt)).toFixed(1)} MT</Badge>
                  </div>
                ))
              )}
              <Link href="/coop/intake">
                <Button className="w-full mt-2 h-8 text-sm" style={{ background: ACCENT }} >
                  Log New Delivery
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: ACCENT }} />
                e-WR Inventory
              </CardTitle>
              <Link href="/coop/inventory">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingEwrs ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)
              ) : (ewrs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No e-WRs issued yet. Finalise a macro lot to request one.</p>
              ) : (
                (ewrs ?? []).slice(0, 5).map(ewr => (
                  <div key={ewr.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{ewr.commodityType} - {ewr.grade}</p>
                      <p className="text-xs text-muted-foreground">{ewr.warehouseCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{parseFloat(String(ewr.weightMt)).toFixed(1)} MT</p>
                      <Badge variant="secondary" className="text-xs">{ewr.state}</Badge>
                    </div>
                  </div>
                ))
              )}
              <Link href="/coop/macro-lots">
                <Button variant="outline" className="w-full mt-2 h-8 text-sm">
                  Manage Macro Lots
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/coop/members", label: "Member Ledger", icon: Users },
            { href: "/coop/intake", label: "Intake Log", icon: ClipboardList },
            { href: "/coop/macro-lots", label: "Macro Lots", icon: Layers },
            { href: "/coop/inventory", label: "e-WR Inventory", icon: Package },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" style={{ color: ACCENT }} />
                  <span className="text-sm font-medium">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
