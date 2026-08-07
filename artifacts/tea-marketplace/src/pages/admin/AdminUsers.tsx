import { useListAuditLog } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Activity, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { format } from "date-fns";

const TIER_COLORS: Record<string, string> = {
  ADMIN:       "bg-red-100 text-red-700 border-red-200",
  ENABLER:     "bg-purple-100 text-purple-700 border-purple-200",
  PRODUCER:    "bg-green-100 text-green-700 border-green-200",
  OFF_TAKER:   "bg-blue-100 text-blue-700 border-blue-200",
  FINANCIER:   "bg-amber-100 text-amber-700 border-amber-200",
};

export default function AdminUsers() {
  const { data: logs, isLoading } = useListAuditLog();

  const actorMap = new Map<string, { actorId: string; actorType?: string; actions: string[]; lastSeen: string }>();
  (logs ?? []).forEach((log: any) => {
    const id = String(log.actorId ?? log.actor ?? "system");
    if (!actorMap.has(id)) {
      actorMap.set(id, { actorId: id, actorType: log.actorType ?? log.tier, actions: [], lastSeen: log.createdAt ?? log.timestamp ?? "" });
    }
    const entry = actorMap.get(id)!;
    if (log.action && !entry.actions.includes(log.action)) entry.actions.push(log.action);
    const ts = log.createdAt ?? log.timestamp ?? "";
    if (ts > entry.lastSeen) entry.lastSeen = ts;
  });

  const actors = Array.from(actorMap.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader title="Platform Users" description="Active accounts and recent platform activity." />

      <div className="flex items-start gap-3 p-4 border border-border bg-muted/10 text-sm text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
        <p>User accounts are managed through Clerk. This view surfaces actors from the platform audit log.</p>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Distinct Actors</div>
            <div className="text-2xl font-bold font-mono">{actors.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Audit Events</div>
            <div className="text-2xl font-bold font-mono">{(logs ?? []).length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Unique Actions</div>
            <div className="text-2xl font-bold font-mono">
              {new Set((logs ?? []).map((l: any) => l.action)).size}
            </div>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Active Users
          </CardTitle>
          <CardDescription>Users who have performed at least one logged action on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : actors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="w-8 h-8 mb-2 text-muted-foreground/30" />
              <p>No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Actor ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 font-medium text-muted-foreground">Recent Actions</th>
                    <th className="pb-3 font-medium text-muted-foreground">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actors.map(actor => (
                    <tr key={actor.actorId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 font-mono text-xs">{actor.actorId}</td>
                      <td className="py-3">
                        {actor.actorType ? (
                          <Badge variant="outline" className={`text-xs rounded-none ${TIER_COLORS[actor.actorType] ?? ""}`}>
                            {actor.actorType}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {actor.actions.slice(0, 3).map(a => (
                            <Badge key={a} variant="secondary" className="text-xs rounded-none">{a}</Badge>
                          ))}
                          {actor.actions.length > 3 && (
                            <Badge variant="outline" className="text-xs rounded-none">+{actor.actions.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {actor.lastSeen ? format(new Date(actor.lastSeen), "MMM d, HH:mm") : "—"}
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
