import { useListAuctions, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Plus, Gavel } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSED:    "bg-zinc-100 text-zinc-600 border-zinc-200",
  SETTLED:   "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminAuctions() {
  const { data: me } = useGetMe();
  const isAdmin = me?.tier === "ADMIN";
  const { data: auctions, isLoading } = useListAuctions();

  const open      = (auctions ?? []).filter(a => a.status === "OPEN").length;
  const scheduled = (auctions ?? []).filter(a => a.status === "SCHEDULED").length;
  const settled   = (auctions ?? []).filter(a => a.status === "SETTLED").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auction Sessions</h1>
            <p className="text-muted-foreground mt-1">Manage and monitor all grain auctions on the platform.</p>
          </div>
          {isAdmin && (
            <Link href="/admin/auctions/new">
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Auction</Button>
            </Link>
          )}
        </div>

        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Open</div>
              <div className="text-2xl font-bold font-mono">{open}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Scheduled</div>
              <div className="text-2xl font-bold font-mono">{scheduled}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Settled</div>
              <div className="text-2xl font-bold font-mono">{settled}</div>
            </CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="w-4 h-4" /> All Sessions ({(auctions ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (auctions ?? []).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gavel className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No auctions scheduled yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Auction</th>
                      <th className="pb-3 font-medium text-muted-foreground">Commodity</th>
                      <th className="pb-3 font-medium text-muted-foreground">Starts</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Reserve / High Bid</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Bids</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(auctions ?? []).map(a => (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <Link href={`/auctions/${a.id}`}>
                            <span className="font-medium hover:underline cursor-pointer">Auction #{a.id}</span>
                          </Link>
                        </td>
                        <td className="py-3 text-muted-foreground">{(a as any).commodityType ?? "—"}</td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {a.startAt ? format(new Date(a.startAt), "MMM d, yyyy HH:mm") : "—"}
                        </td>
                        <td className="py-3 text-right font-mono">
                          {a.currentHighBidUsd
                            ? `$${Number(a.currentHighBidUsd).toLocaleString()}`
                            : a.reservePriceUsd
                            ? `$${Number(a.reservePriceUsd).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="py-3 text-right">{(a as any).bidCount ?? 0}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status] ?? ""}`}>
                            {a.status}
                          </Badge>
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
