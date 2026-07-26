import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListTeaAuctionSessions,
  useListTeaLots,
  useAddLotsToTeaAuctionSession,
  useGetMe,
  getListTeaAuctionSessionsQueryKey,
  getListTeaLotsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarDays, ChevronDown, ChevronRight, Gavel, Info } from "lucide-react";

export default function BrokerAuctions() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // All SCHEDULED sessions
  const { data: sessions, isLoading: sessionsLoading } = useListTeaAuctionSessions(
    { status: "SCHEDULED" },
    { query: { queryKey: getListTeaAuctionSessionsQueryKey({ status: "SCHEDULED" }) } }
  );

  // Broker's lots that are ready to submit (CATALOGUED or DISPATCHED, not yet in a session)
  const { data: allLots, isLoading: lotsLoading } = useListTeaLots(undefined, {
    query: { enabled: !!me?.id, queryKey: getListTeaLotsQueryKey() },
  });

  const mySubmittableLots = (allLots ?? []).filter(
    (l) =>
      l.brokerId === me?.id &&
      ["CATALOGUED", "DISPATCHED"].includes(l.status) &&
      !l.sessionId
  );

  // Per-session lot selection
  const [selectedBySession, setSelectedBySession] = useState<Record<number, number[]>>({});
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const submitLots = useAddLotsToTeaAuctionSession({
    mutation: {
      onSuccess: (_, vars) => {
        toast({ title: "Lots submitted", description: `Your lots have been added to Session #${vars.sessionId}.` });
        queryClient.invalidateQueries({ queryKey: getListTeaAuctionSessionsQueryKey({ status: "SCHEDULED" }) });
        queryClient.invalidateQueries({ queryKey: getListTeaLotsQueryKey() });
        setSelectedBySession((prev) => ({ ...prev, [vars.sessionId]: [] }));
      },
      onError: (err: any) => {
        toast({ title: "Submission failed", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
      },
    },
  });

  const toggleLot = (sessionId: number, lotId: number) => {
    setSelectedBySession((prev) => {
      const current = prev[sessionId] ?? [];
      return {
        ...prev,
        [sessionId]: current.includes(lotId)
          ? current.filter((id) => id !== lotId)
          : [...current, lotId],
      };
    });
  };

  const handleSubmit = (sessionId: number) => {
    const lotIds = selectedBySession[sessionId] ?? [];
    if (lotIds.length === 0) return;
    submitLots.mutate({ sessionId, data: { lotIds } });
  };

  if (sessionsLoading || lotsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Submit Lots to Auction"
        description="Select a scheduled session and submit your catalogued lots."
      />

      {mySubmittableLots.length === 0 && (
        <div className="flex items-start gap-3 p-5 border border-border bg-muted/5 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
          <span>
            You have no catalogued lots available to submit. Create and catalogue lots from the{" "}
            <button
              className="underline text-foreground hover:text-primary transition-colors"
              onClick={() => setLocation("/broker")}
            >
              Broker Dashboard
            </button>
            .
          </span>
        </div>
      )}

      {sessions?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
          <CalendarDays className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No scheduled sessions</h3>
          <p className="text-muted-foreground mt-1">
            The exchange admin hasn't scheduled any upcoming auctions yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions?.map((session) => {
            const isExpanded = expandedSession === session.id;
            const sessionLotIds = (session.catalogueOrder as number[]) ?? [];
            const selected = selectedBySession[session.id] ?? [];

            // Already submitted by this broker in this session
            const alreadyInSession = mySubmittableLots.filter((l) =>
              sessionLotIds.includes(l.id)
            );

            return (
              <Card key={session.id} className="rounded-none border border-border shadow-sm">
                <CardHeader
                  className="p-5 border-b bg-muted/5 cursor-pointer select-none"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-xl font-bold font-mono">
                        Session #{session.id}
                      </CardTitle>
                      <Badge variant="secondary" className="rounded-none text-xs tracking-wider">
                        SCHEDULED
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span className="font-mono">{session.auctionDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gavel className="w-3.5 h-3.5" />
                        <span>{sessionLotIds.length} lot{sessionLotIds.length !== 1 ? "s" : ""} in catalogue</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-5 space-y-5">
                    {mySubmittableLots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No eligible lots available. Catalogue lots first.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground font-medium">
                          Select your lots to include in this session's catalogue:
                        </p>
                        <div className="space-y-3">
                          {mySubmittableLots.map((lot) => {
                            const isChecked = selected.includes(lot.id);
                            return (
                              <div
                                key={lot.id}
                                className="flex items-start gap-4 border border-border p-4 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                                onClick={() => toggleLot(session.id, lot.id)}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleLot(session.id, lot.id)}
                                  className="rounded-none mt-0.5 h-5 w-5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-base flex items-center gap-3">
                                    <span>{lot.grade}</span>
                                    <span className="text-muted-foreground font-medium text-sm">
                                      • {lot.gradeMark}
                                    </span>
                                    <Badge variant="outline" className="rounded-none text-xs ml-auto">
                                      {lot.status}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1.5 flex gap-5 font-medium">
                                    <span>
                                      <span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">
                                        Origin:
                                      </span>
                                      {lot.giOrigin}
                                    </span>
                                    <span>
                                      <span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">
                                        Weight:
                                      </span>
                                      <span className="font-mono">{lot.netWeightKg} kg</span>
                                    </span>
                                    <span>
                                      <span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">
                                        Reserve:
                                      </span>
                                      <span className="font-mono">
                                        ${Number(lot.reservePriceUsd ?? 0).toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            {selected.length} lot{selected.length !== 1 ? "s" : ""} selected
                          </span>
                          <Button
                            className="rounded-none px-8 h-10 font-semibold"
                            disabled={selected.length === 0 || submitLots.isPending}
                            onClick={() => handleSubmit(session.id)}
                          >
                            Submit to Session #{session.id}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
