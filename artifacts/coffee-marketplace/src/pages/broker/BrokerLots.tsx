import { useGetMe, useListCoffeeLots, getListCoffeeLotsQueryKey } from "@workspace/api-client-react";
import { CoffeeLot } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, Coffee, Edit2 } from "lucide-react";
import { Link } from "wouter";

// Correct CoffeeLot status enum: DRAFT | CATALOGUED | DISPATCHED | LIVE | SOLD | UNSOLD | WITHDRAWN | RESERVE_NOT_MET
const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-zinc-100 text-zinc-600 border-zinc-200",
  CATALOGUED:       "bg-slate-100 text-slate-800 border-slate-200",
  DISPATCHED:       "bg-blue-100 text-blue-700 border-blue-200",
  LIVE:             "bg-blue-100 text-blue-800 border-blue-200",
  SOLD:             "bg-green-100 text-green-800 border-green-200",
  UNSOLD:           "bg-zinc-100 text-zinc-600 border-zinc-200",
  WITHDRAWN:        "bg-red-100 text-red-600 border-red-200",
  RESERVE_NOT_MET:  "bg-red-50 text-red-700 border-red-200",
};

// Lots that can still be edited (API allows updates for DRAFT and CATALOGUED)
const EDITABLE_STATUSES = ["DRAFT", "CATALOGUED"];

// Lots still in flight
const PIPELINE_STATUSES = ["DRAFT", "CATALOGUED", "DISPATCHED", "LIVE"];

// Lots that reached a terminal outcome
const TERMINAL_STATUSES = ["SOLD", "UNSOLD", "WITHDRAWN", "RESERVE_NOT_MET"];

export default function BrokerLots() {
  const { data: me } = useGetMe();

  // Scope to lots brokered by the current user
  const brokerId = me?.id;
  const { data: lots, isLoading } = useListCoffeeLots(
    { brokerId } as any,
    { query: { enabled: !!brokerId, queryKey: getListCoffeeLotsQueryKey({ brokerId } as any) } }
  );

  const pipeline = (lots ?? []).filter(l => PIPELINE_STATUSES.includes(l.status));
  const terminal = (lots ?? []).filter(l => TERMINAL_STATUSES.includes(l.status));

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokered Lots</h1>
          <p className="text-muted-foreground mt-1">Coffee lots you have catalogued on behalf of producers.</p>
        </div>
        <Link href="/broker/lots/new">
          <Button className="gap-2"><Plus className="w-4 h-4" /> New Lot</Button>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : (lots ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border rounded-xl border-dashed border-border bg-card/50 gap-3">
          <Coffee className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No brokered lots</p>
            <p className="text-sm mt-0.5">Create your first lot on behalf of a mandated producer.</p>
          </div>
          <Link href="/broker/lots/new">
            <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Create Lot</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pipeline.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {pipeline.map(lot => <LotRow key={lot.id} lot={lot} />)}
              </CardContent>
            </Card>
          )}
          {terminal.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Completed</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {terminal.map(lot => <LotRow key={lot.id} lot={lot} />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function LotRow({ lot }: { lot: CoffeeLot }) {
  const canEdit = EDITABLE_STATUSES.includes(lot.status);
  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Coffee className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{lot.gradeMark ?? `Lot #${lot.id}`}</span>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[lot.status] ?? STATUS_COLORS.DRAFT}`}>
              {lot.status.replace(/_/g, " ")}
            </Badge>
            {lot.grade && <Badge variant="secondary" className="text-xs">{lot.grade}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lot.giOrigin ?? "—"}
            {lot.netWeightKg != null && <span> · {(lot.netWeightKg / 1000).toFixed(2)} MT</span>}
            {lot.reservePriceUsd != null && <span> · Reserve ${lot.reservePriceUsd.toFixed(2)}/kg</span>}
          </p>
          {lot.createdAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {format(new Date(lot.createdAt), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
      {canEdit && (
        <Link href={`/broker/lots/${lot.id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        </Link>
      )}
    </div>
  );
}
