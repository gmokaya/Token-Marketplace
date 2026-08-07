import { useState } from "react";
import { useListSpotListings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Package, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOLD:      "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  EXPIRED:   "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const ALL_STATUSES = ["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"];

const COMMODITY_COLORS: Record<string, string> = {
  MAIZE:   "bg-slate-500/20 text-slate-700 border-slate-500/50",
  RICE:    "bg-teal-500/20 text-teal-700 border-teal-500/50",
  WHEAT:   "bg-amber-500/20 text-amber-700 border-amber-500/50",
  SORGHUM: "bg-orange-500/20 text-orange-700 border-orange-500/50",
};

export default function AdminLots() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: listings, isLoading } = useListSpotListings({});

  const filtered = (listings ?? []).filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (commodityFilter !== "all" && l.commodityType !== commodityFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.warehouseCode ?? "").toLowerCase().includes(q) ||
      (l.commodityType ?? "").toLowerCase().includes(q) ||
      (l.grade ?? "").toLowerCase().includes(q) ||
      String(l.id).includes(q)
    );
  });

  const active   = (listings ?? []).filter((l: any) => l.status === "ACTIVE").length;
  const sold     = (listings ?? []).filter((l: any) => l.status === "SOLD").length;
  const totalMt  = (listings ?? []).reduce((s: number, l: any) => s + parseFloat(l.weightMt ?? "0"), 0);

  const commodities = Array.from(new Set((listings ?? []).map((l: any) => l.commodityType).filter(Boolean)));

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Spot Lots</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide view of every grain lot listed on the spot market.
          </p>
        </div>

        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Lots</div>
              <div className="text-2xl font-bold font-mono">{(listings ?? []).length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Active / Sold</div>
              <div className="text-2xl font-bold font-mono">{active} / {sold}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Volume</div>
              <div className="text-2xl font-bold font-mono">{totalMt.toFixed(1)} MT</div>
            </CardContent></Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by warehouse, commodity, grade..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All commodities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commodities</SelectItem>
              {commodities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Spot Listings ({filtered.length})
            </CardTitle>
            <CardDescription>All grain lots available or transacted on the spot market.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No lots match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Lot #</th>
                      <th className="pb-3 font-medium text-muted-foreground">Commodity</th>
                      <th className="pb-3 font-medium text-muted-foreground">Warehouse</th>
                      <th className="pb-3 font-medium text-muted-foreground">Grade</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Weight (MT)</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Price / MT</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Listed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((l: any) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs text-muted-foreground">#{l.id}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-xs ${COMMODITY_COLORS[l.commodityType] ?? ""}`}>
                            {l.commodityType ?? "—"}
                          </Badge>
                        </td>
                        <td className="py-3 font-medium">{l.warehouseCode ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">{l.grade ?? "—"}</td>
                        <td className="py-3 text-right font-mono">
                          {l.weightMt != null ? parseFloat(l.weightMt).toFixed(2) : "—"}
                        </td>
                        <td className="py-3 text-right font-mono">
                          {l.pricePerMtUsd != null ? `$${parseFloat(l.pricePerMtUsd).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[l.status] ?? ""}`}>
                            {l.status ?? "—"}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {l.createdAt ? format(new Date(l.createdAt), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
