import { useState } from "react";
import { useListCoffeeLots } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Coffee, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const ALL_STATUSES = ["DRAFT", "CATALOGUED", "DISPATCHED", "LIVE", "SOLD", "UNSOLD", "WITHDRAWN", "RESERVE_NOT_MET"];
const ALL_GRADES = ["AA", "AB", "PB", "C", "E (Elephant)", "T (Triage)"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CATALOGUED: "bg-slate-100 text-slate-800 border-slate-200",
  DISPATCHED: "bg-blue-100 text-blue-700 border-blue-200",
  LIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SOLD: "bg-green-100 text-green-800 border-green-200",
  UNSOLD: "bg-zinc-100 text-zinc-600 border-zinc-200",
  WITHDRAWN: "bg-red-100 text-red-600 border-red-200",
  RESERVE_NOT_MET: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminLots() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: lots, isLoading } = useListCoffeeLots(
    {
      ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
      ...(gradeFilter !== "all" ? { grade: gradeFilter } : {}),
    },
    { query: { queryKey: ["admin-coffee-lots", statusFilter, gradeFilter] } }
  );

  const filtered = (lots ?? []).filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.gradeMark ?? "").toLowerCase().includes(q) ||
      (l.giOrigin ?? "").toLowerCase().includes(q) ||
      (l.grade ?? "").toLowerCase().includes(q) ||
      String(l.id).includes(q)
    );
  });

  // Summary counts
  const liveLots = (lots ?? []).filter(l => l.status === "LIVE").length;
  const soldLots = (lots ?? []).filter(l => l.status === "SOLD").length;
  const totalMt = (lots ?? []).reduce((s, l) => s + (l.netWeightKg ?? 0) / 1000, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Coffee Lots</h1>
          <p className="text-muted-foreground mt-1">Platform-wide view of every brokered lot.</p>
        </div>
      </div>

      {/* Summary */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by lot mark, origin, grade..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {ALL_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lots table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lots ({filtered.length})</CardTitle>
          <CardDescription>Click a lot to view on the spot market.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p>No lots match your filters.</p>
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
                    <th className="pb-3 font-medium text-muted-foreground text-right">Reserve</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(lot => (
                    <tr key={lot.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{lot.gradeMark ?? `Lot #${lot.id}`}</div>
                        <div className="text-xs text-muted-foreground">#{lot.id}</div>
                      </td>
                      <td className="py-3 text-muted-foreground">{lot.giOrigin ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{lot.grade ?? "—"}</td>
                      <td className="py-3 text-right font-mono">
                        {lot.netWeightKg != null ? `${(lot.netWeightKg / 1000).toFixed(2)} MT` : "—"}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {lot.reservePriceUsd != null ? `$${lot.reservePriceUsd.toFixed(2)}/kg` : "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lot.status] ?? ""}`}>
                          {lot.status.replace(/_/g, " ")}
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
