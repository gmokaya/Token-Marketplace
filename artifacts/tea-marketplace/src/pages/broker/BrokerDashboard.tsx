import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMe, useListTeaLots, useTeaLotTakeOut, useAcceptTeaLotBelowReserve,
  getListTeaLotsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Gavel, FileEdit, Archive, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  DRAFT:           "Draft",
  CATALOGUED:      "Catalogued",
  DISPATCHED:      "Dispatched",
  LIVE:            "Live",
  SOLD:            "Sold",
  RESERVE_NOT_MET: "Reserve Not Met",
  UNSOLD:          "Unsold",
  WITHDRAWN:       "Withdrawn",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:           "bg-muted text-muted-foreground",
  CATALOGUED:      "bg-blue-50 text-blue-700 border-blue-200",
  DISPATCHED:      "bg-amber-50 text-amber-700 border-amber-200",
  LIVE:            "bg-green-50 text-green-700 border-green-200",
  SOLD:            "bg-primary/10 text-primary border-primary/20",
  RESERVE_NOT_MET: "bg-red-50 text-red-700 border-red-200",
  UNSOLD:          "bg-muted text-muted-foreground",
  WITHDRAWN:       "bg-muted text-muted-foreground",
};

const ALL_STATUSES = ["DRAFT", "CATALOGUED", "DISPATCHED", "LIVE", "SOLD", "RESERVE_NOT_MET", "WITHDRAWN"];

export default function BrokerDashboard() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const [activeTab, setActiveTab] = useState("DRAFT");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Server-side filtered by brokerId. No client-side re-filter needed
  const { data: lots = [], isLoading, isError } = useListTeaLots(
    { brokerId: user?.id },
    { query: { enabled: !!user?.id, queryKey: getListTeaLotsQueryKey({ brokerId: user?.id }) } }
  );

  const takeOutMutation = useTeaLotTakeOut({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lot withdrawn" });
        queryClient.invalidateQueries({ queryKey: getListTeaLotsQueryKey({ brokerId: user?.id }) });
      },
    },
  });

  const acceptMutation = useAcceptTeaLotBelowReserve({
    mutation: {
      onSuccess: () => {
        toast({ title: "Accepted below reserve" });
        queryClient.invalidateQueries({ queryKey: getListTeaLotsQueryKey({ brokerId: user?.id }) });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border border-border">
        Failed to load lots. Please try again.
      </div>
    );
  }

  const lotsByStatus = lots.reduce<Record<string, typeof lots>>((acc, lot) => {
    (acc[lot.status] ??= []).push(lot);
    return acc;
  }, {});

  const activeLots  = (lotsByStatus["CATALOGUED"]?.length ?? 0) + (lotsByStatus["DISPATCHED"]?.length ?? 0) + (lotsByStatus["LIVE"]?.length ?? 0);
  const soldLots    = lotsByStatus["SOLD"]?.length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Broker Dashboard"
        description="Manage tea lots, auction submissions, and mandate producers."
        actions={
          <>
            <Button variant="outline" className="rounded-none h-10 gap-2" onClick={() => setLocation("/broker/mandate-holders")}>
              <Users className="w-4 h-4" /> Mandate Holders
            </Button>
            <Button variant="outline" className="rounded-none h-10 gap-2" onClick={() => setLocation("/broker/auctions")}>
              <Gavel className="w-4 h-4" /> Submit to Auction
            </Button>
            <Button className="rounded-none h-10 gap-2" onClick={() => setLocation("/broker/lots/new")}>
              <Plus className="w-4 h-4" /> New Lot
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Lots",   value: lots.length },
          { label: "Active",       value: activeLots,  sub: "catalogued · live" },
          { label: "Sold",         value: soldLots },
          { label: "Action Req.",  value: lotsByStatus["RESERVE_NOT_MET"]?.length ?? 0, sub: "reserve not met" },
        ].map((c) => (
          <Card key={c.label} className="rounded-none shadow-sm border border-border">
            <CardHeader className="p-5 pb-2 border-b bg-muted/5">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="text-4xl font-bold tracking-tight">{c.value}</div>
              {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lots table, tabbed by status */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-0 overflow-x-auto">
          {ALL_STATUSES.map((status) => (
            <TabsTrigger
              key={status}
              value={status}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-sm text-muted-foreground data-[state=active]:text-foreground transition-none whitespace-nowrap"
            >
              {STATUS_LABELS[status] ?? status}
              {(lotsByStatus[status]?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-none text-xs bg-muted/50">
                  {lotsByStatus[status]!.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_STATUSES.map((status) => (
          <TabsContent key={status} value={status} className="pt-6 outline-none">
            {!(lotsByStatus[status]?.length) ? (
              <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
                <Archive className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No {STATUS_LABELS[status]?.toLowerCase()} lots</h3>
                {status === "DRAFT" && (
                  <Button className="rounded-none mt-4 gap-2" onClick={() => setLocation("/broker/lots/new")}>
                    <Plus className="w-4 h-4" /> Create first lot
                  </Button>
                )}
              </div>
            ) : (
              <div className="border border-border divide-y divide-border">
                {lotsByStatus[status]!.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{lot.grade}</span>
                        <span className="text-muted-foreground text-sm">- {lot.gradeMark}</span>
                        <Badge
                          variant="outline"
                          className={`rounded-none text-[10px] uppercase tracking-wider ${STATUS_BADGE[lot.status] ?? ""}`}
                        >
                          {STATUS_LABELS[lot.status] ?? lot.status}
                        </Badge>
                        <Badge variant="secondary" className="rounded-none text-[10px]">
                          {lot.listingType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parseFloat(String(lot.netWeightKg)).toFixed(1)} kg net · {lot.giOrigin}
                        {lot.reservePriceUsd != null ? ` · Reserve $${parseFloat(String(lot.reservePriceUsd)).toFixed(2)}/kg` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/lots/${lot.id}`}>
                        <Button variant="outline" size="sm" className="rounded-none gap-1.5 h-8 text-xs">
                          <Gavel className="w-3 h-3" /> View
                        </Button>
                      </Link>

                      {(status === "DRAFT" || status === "CATALOGUED") && (
                        <Link href={`/broker/lots/${lot.id}/edit`}>
                          <Button variant="secondary" size="sm" className="rounded-none gap-1.5 h-8 text-xs">
                            <FileEdit className="w-3 h-3" /> Edit
                          </Button>
                        </Link>
                      )}

                      {status === "RESERVE_NOT_MET" && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-none h-8 text-xs gap-1.5"
                            onClick={() => acceptMutation.mutate({ lotId: lot.id })}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3" /> Accept
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-none h-8 text-xs gap-1.5"
                            onClick={() => takeOutMutation.mutate({ lotId: lot.id })}
                            disabled={takeOutMutation.isPending}
                          >
                            <Archive className="w-3 h-3" /> Withdraw
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
