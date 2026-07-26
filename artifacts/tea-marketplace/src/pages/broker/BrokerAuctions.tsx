import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListTeaAuctionSessions,
  useListTeaLots,
  useAddLotsToTeaAuctionSession,
  useGetMe,
  getListTeaAuctionSessionsQueryKey,
  getListTeaLotsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, ChevronDown, ChevronRight, Gavel, Info, Radio } from "lucide-react";

export default function BrokerAuctions() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scheduled, isLoading: scheduledLoading } = useListTeaAuctionSessions(
    { status: "SCHEDULED" },
    { query: { queryKey: getListTeaAuctionSessionsQueryKey({ status: "SCHEDULED" }) } }
  );
  const { data: live, isLoading: liveLoading } = useListTeaAuctionSessions(
    { status: "LIVE" },
    { query: { queryKey: getListTeaAuctionSessionsQueryKey({ status: "LIVE" }) } }
  );

  const { data: allLots, isLoading: lotsLoading } = useListTeaLots(undefined, {
    query: { enabled: !!me?.id, queryKey: getListTeaLotsQueryKey() },
  });

  const mySubmittableLots = (allLots ?? []).filter(
    (l) =>
      l.brokerId === me?.id &&
      ["CATALOGUED", "DISPATCHED"].includes(l.status) &&
      !l.sessionId
  );

  const [selectedBySession, setSelectedBySession] = useState<Record<number, number[]>>({});
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const submitLots = useAddLotsToTeaAuctionSession({
    mutation: {
      onSuccess: (_, vars) => {
        toast({ title: "Lots submitted", description: `Added to Session #${vars.sessionId}.` });
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

  if (scheduledLoading || liveLoading || lotsLoading) {
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
        title="Auction Sessions"
        description="Submit your catalogued lots to scheduled sessions. Join live sessions as they run."
      />

      {/* ── Live sessions ── */}
      {(live?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Live Now</p>
          {live!.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-center gap-4">
                <Radio className="w-4 h-4 text-destructive animate-pulse shrink-0" />
                <div>
                  <p className="font-bold text-sm">Session #{session.id}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{session.auctionDate}</p>
                </div>
                <Badge variant="destructive" className="rounded-none text-[10px] tracking-widest uppercase px-2 py-0.5">
                  LIVE
                </Badge>
              </div>
              <Link href={`/auction/${session.id}`}>
                <Button className="rounded-none h-9 px-5 text-sm font-semibold gap-2">
                  <Gavel className="w-3.5 h-3.5" /> Open Terminal
                </Button>
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* ── Submittable lots notice ── */}
      {mySubmittableLots.length === 0 && (
        <div className="flex items-start gap-3 p-4 border border-border bg-muted/5 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary/50" />
          <span>
            No catalogued lots available to submit.{" "}
            <button
              className="underline text-foreground hover:text-primary transition-colors"
              onClick={() => setLocation("/broker")}
            >
              Go to Dashboard
            </button>{" "}
            to catalogue your lots first.
          </span>
        </div>
      )}

      {/* ── Scheduled sessions ── */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          Scheduled Sessions
        </p>

        {scheduled?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center border border-border bg-muted/5">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium">No upcoming sessions</p>
            <p className="text-sm text-muted-foreground mt-1">
              The exchange hasn't scheduled any auctions yet.
            </p>
          </div>
        ) : (
          scheduled?.map((session) => {
            const isExpanded = expandedSession === session.id;
            const sessionLotIds = (session.catalogueOrder as number[]) ?? [];
            const selected = selectedBySession[session.id] ?? [];

            return (
              <div key={session.id} className="border border-border">
                {/* Session header */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-colors text-left"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold font-mono">Session #{session.id}</span>
                    <Badge variant="secondary" className="rounded-none text-[10px] tracking-widest uppercase px-2 py-0.5">
                      SCHEDULED
                    </Badge>
                  </div>
                  <div className="flex items-center gap-5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span className="font-mono">{session.auctionDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5" />
                      <span>{sessionLotIds.length} lot{sessionLotIds.length !== 1 ? "s" : ""}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Lot selector */}
                {isExpanded && (
                  <div className="p-5 space-y-5 border-t border-border">
                    {mySubmittableLots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No eligible lots available. Catalogue lots first.</p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Select lots to submit to this session
                        </p>
                        <div className="space-y-2">
                          {mySubmittableLots.map((lot) => {
                            const isChecked = selected.includes(lot.id);
                            return (
                              <div
                                key={lot.id}
                                className={`flex items-start gap-4 border p-4 cursor-pointer transition-colors ${
                                  isChecked
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border bg-muted/5 hover:bg-muted/10"
                                }`}
                                onClick={() => toggleLot(session.id, lot.id)}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleLot(session.id, lot.id)}
                                  className="rounded-none mt-0.5 h-4 w-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm flex items-center gap-2">
                                    <span>{lot.grade}</span>
                                    <span className="text-muted-foreground font-normal">· {lot.gradeMark}</span>
                                    <Badge variant="outline" className="rounded-none text-[10px] ml-auto">
                                      {lot.status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1.5 flex gap-4">
                                    <span><span className="font-semibold text-foreground mr-1">Origin</span>{lot.giOrigin}</span>
                                    <span><span className="font-semibold text-foreground mr-1">Net</span><span className="font-mono">{lot.netWeightKg} kg</span></span>
                                    <span><span className="font-semibold text-foreground mr-1">Reserve</span><span className="font-mono">${Number(lot.reservePriceUsd ?? 0).toFixed(2)}</span></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            {selected.length} lot{selected.length !== 1 ? "s" : ""} selected
                          </span>
                          <Button
                            className="rounded-none px-8 h-9 font-semibold text-sm"
                            disabled={selected.length === 0 || submitLots.isPending}
                            onClick={() => handleSubmit(session.id)}
                          >
                            Submit to Session #{session.id}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
