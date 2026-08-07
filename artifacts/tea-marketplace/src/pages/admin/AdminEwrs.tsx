import { useState } from "react";
import { useListEwrs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ScrollText, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  INGESTED:      "bg-blue-50 text-blue-700 border-blue-200",
  MARKET_LISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SETTLED:       "bg-green-100 text-green-800 border-green-200",
  CANCELLED:     "bg-red-50 text-red-600 border-red-200",
  MATURED:       "bg-amber-50 text-amber-700 border-amber-200",
};

const ALL_STATUSES = ["INGESTED", "MARKET_LISTED", "SETTLED", "CANCELLED", "MATURED"];

export default function AdminEwrs() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: ewrs, isLoading } = useListEwrs();

  const filtered = (ewrs ?? []).filter((e: any) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(e.id).includes(q) ||
      (e.warehouseCode ?? "").toLowerCase().includes(q) ||
      (e.gradeMark ?? "").toLowerCase().includes(q) ||
      (e.grade ?? "").toLowerCase().includes(q) ||
      (e.commodityType ?? "").toLowerCase().includes(q)
    );
  });

  const ingested     = (ewrs ?? []).filter((e: any) => e.status === "INGESTED").length;
  const marketListed = (ewrs ?? []).filter((e: any) => e.status === "MARKET_LISTED").length;
  const totalMt      = (ewrs ?? []).reduce((s: number, e: any) => s + (e.netWeightKg ?? 0) / 1000, 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="All eWRs"
        description="Electronic Warehouse Receipts ingested by producers via API."
      />

      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total eWRs</div>
            <div className="text-2xl font-bold font-mono">{(ewrs ?? []).length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Ingested</div>
            <div className="text-2xl font-bold font-mono">{ingested}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Market Listed</div>
            <div className="text-2xl font-bold font-mono">{marketListed}</div>
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
            placeholder="Search by ID, warehouse code, grade..."
            className="pl-9 rounded-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-none">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4" /> Warehouse Receipts ({filtered.length})
          </CardTitle>
          <CardDescription>All receipts pushed by producers via the integration API.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="w-8 h-8 mb-2 text-muted-foreground/30" />
              <p>No eWRs match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Warehouse</th>
                    <th className="pb-3 font-medium text-muted-foreground">Grade / Mark</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Net Weight</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Ingested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 font-mono text-xs text-muted-foreground">#{e.id}</td>
                      <td className="py-3 font-medium">{e.warehouseCode ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{e.gradeMark ?? e.grade ?? "—"}</td>
                      <td className="py-3 text-right font-mono">
                        {e.netWeightKg != null ? `${(e.netWeightKg / 1000).toFixed(2)} MT` : "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs rounded-none ${STATUS_COLORS[e.status] ?? ""}`}>
                          {(e.status ?? "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {e.createdAt ? format(new Date(e.createdAt), "MMM d, yyyy") : "—"}
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
  );
}
