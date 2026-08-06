import { useListAuditLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminAudit() {
  const { data: logs, isLoading } = useListAuditLog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Immutable ledger of critical system events.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-96 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium">Entity</th>
                    <th className="pb-3 font-medium">Actor</th>
                    <th className="pb-3 font-medium">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs?.map(log => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4 whitespace-nowrap">{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</td>
                      <td className="py-3 pr-4 font-medium">{log.action}</td>
                      <td className="py-3 pr-4">{log.entityType} #{log.entityId}</td>
                      <td className="py-3 pr-4">{log.actorName || `User ${log.actorId}`}</td>
                      <td className="py-3 font-mono text-xs text-muted-foreground truncate max-w-[150px]" title={log.payloadHash}>
                        {log.payloadHash.substring(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!logs?.length && <div className="text-center py-8 text-muted-foreground">No audit events found.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
