import { Link } from "wouter";
import { useGetWarehouseDistribution } from "@workspace/api-client-react";
import { ArrowRight, CheckCircle2, Package, Warehouse, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Warehouses() {
  const { data, isLoading } = useGetWarehouseDistribution();
  const grainWarehouses = (data ?? []).filter((warehouse) => !warehouse.activeCommodities?.length || warehouse.activeCommodities.some((commodity) => ["MAIZE", "RICE"].includes(commodity)));
  const totalEwrs = grainWarehouses.reduce((sum, warehouse) => sum + warehouse.ewrCount, 0);
  const totalWeight = grainWarehouses.reduce((sum, warehouse) => sum + warehouse.totalWeightMt, 0);

  return (
    <div className="space-y-6 pb-12">
      <div><h1 className="text-3xl font-bold tracking-tight">Certified grain warehouses</h1><p className="mt-1 text-muted-foreground">WRSC-licensed facilities holding verified MAIZE and RICE warehouse receipts.</p></div>
      {!isLoading && <div className="grid grid-cols-3 gap-3"><Stat label="Warehouses" value={grainWarehouses.length} /><Stat label="eWRs" value={totalEwrs} /><Stat label="Stored volume" value={`${totalWeight.toFixed(1)} MT`} /></div>}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>All facilities shown are part of the WRSC warehouse receipt network. Open a facility to inspect its Grain eWRs.</span></div>
      {isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-48 w-full" />)}</div> : grainWarehouses.length === 0 ? <Empty /> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{grainWarehouses.map((warehouse) => <Link key={warehouse.warehouseCode} href={`/warehouses/${encodeURIComponent(warehouse.warehouseCode)}`}><Card className="h-full transition-shadow hover:shadow-md"><div className="h-1.5 bg-primary" /><CardHeader className="pb-3"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Warehouse className="h-5 w-5 text-primary" /></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">WRSC licensed</Badge></div><CardTitle className="mt-3 font-mono text-base">{warehouse.warehouseCode}</CardTitle><CardDescription className="text-xs">{warehouse.activeCommodities?.length ? warehouse.activeCommodities.filter((commodity) => ["MAIZE", "RICE"].includes(commodity)).join(" · ") : "MAIZE · RICE"}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-3"><SmallStat icon={Package} label="eWRs" value={String(warehouse.ewrCount)} /><SmallStat icon={Weight} label="Stock" value={`${warehouse.totalWeightMt.toFixed(1)} MT`} /></div><div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">View receipts <ArrowRight className="h-3.5 w-3.5" /></div></CardContent></Card></Link>)}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xl font-bold">{value}</p></CardContent></Card>; }
function SmallStat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) { return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-sm font-semibold">{value}</p></div></div>; }
function Empty() { return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center"><Warehouse className="h-8 w-8 text-muted-foreground/40" /><p className="font-medium">No grain warehouses found</p><p className="text-sm text-muted-foreground">Warehouse data will appear as grain eWRs are issued.</p></div>; }