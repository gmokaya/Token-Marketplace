import { useState } from "react";
import { useListTeaLots } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Leaf, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const ALL_STATUSES = ["DRAFT", "CATALOGUED", "DISPATCHED", "LIVE", "SOLD", "UNSOLD", "WITHDRAWN", "RESERVE_NOT_MET"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT:           "bg-zinc-100 text-zinc-600 border-zinc-200",
  CATALOGUED:      "bg-slate-100 text-slate-800 border-slate-200",
  DISPATCHED:      "bg-blue-50 text-blue-700 border-blue-200",
  LIVE:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOLD:            "bg-green-100 text-green-800 border-green-200",
  UNSOLD:          "bg-zinc-100 text-zinc-600 border-zinc-200",
  WITHDRAWN:       "bg-red-50 text-red-600 border-red-200",
  RESERVE_NOT_MET: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminLots() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: lots, isLoading } = useListTeaLots(
    statusFilter !== "all" ? { status: statusFilter as any } : {},
    { query: { queryKey: ["admin-tea-lots", statusFilter] } }
  );

  const filtered = (lots ?? []).filter((l: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.gradeMark ?? "").toLowerCase().includes(q) ||
      (l.origin ?? "").toLowerCase().includes(q) ||
      (l.grade ?? "").toLowerCase().includes(q) ||
      (l.teaType ?? "").toLowerCase().includes(q) ||
      String(l.id).includes(q)
    );
  });

  const liveLots   = (lots ?? []).filter((l: any) => l.status === "LIVE").length;
  const soldLots   = (lots ?? []).filter((l: any) => l.status === "SOLD").length;
  const totalMt    = (lots ?? []).reduce((s: number, l: any) => s + (l.netWeightKg ?? 0) / 1000, 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="All Tea Lots"
        description="Platform-wide view of every brokered lot."
      />

      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Lots</div>
            <div className="text-2xl font-bold font-mono">{(lots ?? []).length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Live / Sold</div>
            <div className="text-2xl font-bold font-mono">{liveLots} / {soldLots}</div>
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
            placeholder="Search by grade mark, origin, type..."
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
          <CardTitle className="text-base">Lots ({filtered.length})</CardTitle>
          <CardDescription>Click lot ID to view on the spot market.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Leaf className="w-8 h-8 mb-2 text-muted-foreground/30" />
              <p>No lots match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Lot</th>
                    <th className="pb-3 font-medium text-muted-foreground">Origin</th>
                    <th className="pb-3 font-medium text-muted-foreground">Type / Grade</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Weight</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Reserve</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((lot: any) => (
                    <tr key={lot.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3">
                        <Link href={`/lots/${lot.id}`} className="font-medium hover:underline">
                          {lot.gradeMark ?? `Lot #${lot.id}`}
                        </Link>
                        <div className="text-xs text-muted-foreground">#{lot.id}</div>
                      </td>
                      <td className="py-3 text-muted-foreground">{lot.origin ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">
                        {[lot.teaType, lot.grade].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {lot.netWeightKg != null ? `${(lot.netWeightKg / 1000).toFixed(2)} MT` : "—"}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {lot.reservePriceUsd != null ? `$${Number(lot.reservePriceUsd).toFixed(2)}/kg` : "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs rounded-none ${STATUS_COLORS[lot.status] ?? ""}`}>
                          {(lot.status ?? "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {lot.createdAt ? format(new Date(lot.createdAt), "MMM d, yyyy") : "—"}
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
