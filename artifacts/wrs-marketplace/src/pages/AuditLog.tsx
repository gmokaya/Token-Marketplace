import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListAuditLog } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Search, Hash, User, Calendar } from "lucide-react";

const ACTION_STYLES: Record<string, string> = {
  // ── Financing ────────────────────────────────────────────────────────────
  FINANCING_REQUESTED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  FINANCING_APPROVED: "bg-green-100 text-green-700 border-green-200",
  FINANCING_REJECTED: "bg-red-100 text-red-700 border-red-200",
  FINANCING_DISBURSED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  // ── Settlement ───────────────────────────────────────────────────────────
  SETTLEMENT_INITIATED: "bg-blue-100 text-blue-700 border-blue-200",
  SETTLEMENT_LEG_DISBURSED_BANK: "bg-orange-100 text-orange-700 border-orange-200",
  SETTLEMENT_LEG_DISBURSED_PLATFORM: "bg-purple-100 text-purple-700 border-purple-200",
  SETTLEMENT_LEG_DISBURSED_PRODUCER: "bg-green-100 text-green-700 border-green-200",
  // ── WRSC Registry ────────────────────────────────────────────────────────
  WRSC_LIEN_LOCK_TRANSMITTED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  WRSC_BANK_INGRESS_CONFIRMED: "bg-cyan-100 text-cyan-700 border-cyan-200",
  WRSC_LIEN_RELEASE_REQUESTED: "bg-teal-100 text-teal-700 border-teal-200",
  WRSC_TITLE_TRANSFERRED: "bg-violet-100 text-violet-700 border-violet-200",
  // ── Auction Engine (§6.1 AUCTION_ACTIVE state) ───────────────────────────
  AUCTION_CREATED: "bg-sky-100 text-sky-700 border-sky-200",
  BID_PLACED: "bg-blue-100 text-blue-700 border-blue-200",
  ANTI_SNIPE_EXTENDED: "bg-amber-100 text-amber-700 border-amber-200",
  AUCTION_CLOSED: "bg-green-100 text-green-700 border-green-200",
  AUCTION_CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  // ── Forward Contract Engine (§6.1 FORWARD_BOUND state) ───────────────────
  FORWARD_CREATED: "bg-lime-100 text-lime-700 border-lime-200",
  FORWARD_CO_SIGNED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FORWARD_BOND_POSTED: "bg-teal-100 text-teal-700 border-teal-200",
  FORWARD_DEFAULTED: "bg-red-100 text-red-700 border-red-200",
  FORWARD_MATURED: "bg-violet-100 text-violet-700 border-violet-200",
  // ── Spot Market ──────────────────────────────────────────────────────────
  LISTING_CREATED: "bg-cyan-100 text-cyan-700 border-cyan-200",
  LISTING_CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  ORDER_PLACED: "bg-blue-100 text-blue-700 border-blue-200",
  ORDER_CANCELLED: "bg-orange-100 text-orange-700 border-orange-200",
  ORDER_EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

function truncateHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function AuditLog() {
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [entityIdFilter, setEntityIdFilter] = useState("");

  const params: Record<string, any> = { limit: 100 };
  if (entityTypeFilter) params.entityType = entityTypeFilter;
  if (entityIdFilter && !isNaN(parseInt(entityIdFilter))) params.entityId = parseInt(entityIdFilter);

  const { data: logs, isLoading } = useListAuditLog(params, {
    query: { refetchInterval: 10000 } as any,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-muted-foreground mt-1">Compliance trail: every state change with an immutable SHA-256 hash</p>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Tamper-evident hashes</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Search className="w-3 h-3" />Entity Type</Label>
            <Input
              className="h-8 w-48 text-sm"
              placeholder="e.g. SETTLEMENT"
              value={entityTypeFilter}
              onChange={e => setEntityTypeFilter(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entity ID</Label>
            <Input
              className="h-8 w-28 text-sm"
              type="number"
              placeholder="1"
              value={entityIdFilter}
              onChange={e => setEntityIdFilter(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        )}

        {!isLoading && !logs?.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No audit entries found{entityTypeFilter || entityIdFilter ? " matching these filters" : ""}.
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {logs?.map(entry => (
            <Card key={entry.id} className="hover:border-muted-foreground/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-medium ${ACTION_STYLES[entry.action] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {entry.action}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        {entry.entityType} #{entry.entityId}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {(entry as any).actorName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {(entry as any).actorName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground" title={entry.payloadHash}>
                      <Hash className="w-3 h-3" />
                      <span className="text-xs">{truncateHash(entry.payloadHash)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">SHA-256</span>
                  </div>
                </div>

                {entry.metadata && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View payload</summary>
                    <pre className="mt-1 text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(JSON.parse(entry.metadata), null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
