import { useGetWarehouseDistribution } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Warehouse, Package, Weight, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Warehouses() {
  const { data: warehouses, isLoading } = useGetWarehouseDistribution();

  const coffeeWarehouses = (warehouses ?? []).filter(w =>
    !w.activeCommodities || w.activeCommodities.length === 0 || w.activeCommodities.includes("COFFEE")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certified Warehouses</h1>
        <p className="text-muted-foreground mt-1">
          WRSC-licensed facilities storing eWR-backed coffee lots. All receipts are insured and audited.
        </p>
      </div>

      {/* Summary bar */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Warehouses</div>
              <div className="text-2xl font-bold font-mono">{coffeeWarehouses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total eWRs</div>
              <div className="text-2xl font-bold font-mono">
                {coffeeWarehouses.reduce((s, w) => s + w.ewrCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Stock</div>
              <div className="text-2xl font-bold font-mono">
                {coffeeWarehouses.reduce((s, w) => s + w.totalWeightMt, 0).toFixed(0)} MT
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WRSC Badge */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-sm">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <p>
          All listed warehouses hold a valid Warehouse Receipt System Corporation (WRSC) licence.
          Goods stored here are eligible for eWR issuance and trade finance against warehouse receipts.
        </p>
      </div>

      {/* Warehouse grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : coffeeWarehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-xl border-dashed border-border gap-3">
          <Warehouse className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">No warehouses found</p>
          <p className="text-sm text-muted-foreground">Warehouse data will appear once eWRs are issued on the platform.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coffeeWarehouses.map(w => (
            <Link key={w.warehouseCode} href={`/warehouses/${encodeURIComponent(w.warehouseCode)}`}>
              <Card className="hover:border-accent/50 hover:shadow-md transition-all cursor-pointer group h-full">
                <div className="h-1.5 w-full bg-gradient-to-r from-accent/40 to-accent rounded-t-xl" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-accent" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      WRSC Licensed
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3 group-hover:text-accent transition-colors font-mono">
                    {w.warehouseCode}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {w.activeCommodities && w.activeCommodities.length > 0
                      ? w.activeCommodities.join(" · ")
                      : "Coffee · General Produce"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">eWRs</div>
                        <div className="font-bold font-mono text-sm">{w.ewrCount}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                        <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Stock</div>
                        <div className="font-bold font-mono text-sm">{w.totalWeightMt.toFixed(1)} MT</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span>View lots & eWRs</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
