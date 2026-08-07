import { useListAuditLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Shield } from "lucide-react";
import { format } from "date-fns";

export default function AdminAudit() {
  const { data: logs, isLoading } = useListAuditLog();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Audit Log"
        description="Immutable ledger of critical system events."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> System Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (logs ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Shield className="w-8 h-8 mb-2 text-muted-foreground/30" />
              <p>No audit events found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Timestamp</th>
                    <th className="pb-3 font-medium text-muted-foreground">Action</th>
                    <th className="pb-3 font-medium text-muted-foreground">Entity</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actor</th>
                    <th className="pb-3 font-medium text-muted-foreground">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(logs as any[]).slice(0, 100).map((log, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {log.createdAt ?? log.timestamp
                          ? format(new Date(log.createdAt ?? log.timestamp), "MMM d, HH:mm:ss")
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className="text-xs font-mono rounded-none">
                          {log.action ?? "—"}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {log.entityType ?? "—"}{log.entityId != null ? ` #${log.entityId}` : ""}
                      </td>
                      <td className="py-2.5 text-xs font-mono truncate max-w-[120px]">
                        {log.actorName || log.actorId || log.actor || "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground font-mono">
                        {log.payloadHash ?? log.txHash
                          ? `${String(log.payloadHash ?? log.txHash).slice(0, 14)}…`
                          : "—"}
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
