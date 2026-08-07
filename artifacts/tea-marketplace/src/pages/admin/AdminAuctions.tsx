import { Link } from "wouter";
import {
  useListTeaAuctionSessions, useStartTeaAuctionSession, getListTeaAuctionSessionsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Gavel, CalendarDays, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { format } from "date-fns";

const STATUS_COLOR: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  LIVE: "destructive",
  CLOSED: "outline",
  COMPLETED: "outline",
};

export default function AdminAuctions() {
  const { data: me } = useGetMe();
  const isAdmin = me?.tier === "ADMIN";

  const { data: auctions, isLoading, isError } = useListTeaAuctionSessions(
    {},
    { query: { queryKey: getListTeaAuctionSessionsQueryKey({}) } }
  );

  const queryClient = useQueryClient();
  const startAuction = useStartTeaAuctionSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeaAuctionSessionsQueryKey({}) });
      },
    },
  });

  if (isLoading) return <Skeleton className="w-full h-[400px]" />;
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Failed to load auction sessions.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Auction Sessions"
        description={isAdmin ? "Schedule and manage tea auction sessions." : "Live auction activity for all scheduled sessions."}
        actions={
          isAdmin ? (
            <Link href="/admin/auctions/new">
              <Button className="rounded-none gap-2 h-10 font-semibold text-sm">
                <Gavel className="w-4 h-4" /> New Session
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {(auctions ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
            <Gavel className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium">No auction sessions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Create a session to get started." : "Check back when the exchange schedules a session."}
            </p>
          </div>
        ) : (
          (auctions ?? []).map((auction: any) => (
            <div
              key={auction.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-5 min-w-0">
                <div className="shrink-0">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Session</span>
                  <p className="text-xl font-bold font-mono leading-tight">#{auction.id}</p>
                </div>

                <div className="h-8 w-px bg-border shrink-0" />

                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-foreground font-medium">
                      {auction.auctionDate
                        ? format(new Date(auction.auctionDate + "T12:00:00"), "EEE, MMM d yyyy")
                        : "TBD"}
                    </span>
                    {auction.scheduledStartTime && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-muted-foreground">{auction.scheduledStartTime}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {auction.catalogueOrder && (
                      <span>
                        <span className="font-semibold text-foreground">{auction.catalogueOrder.length}</span> lots
                      </span>
                    )}
                    <Badge
                      variant={STATUS_COLOR[auction.status] ?? "secondary"}
                      className="rounded-none px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-bold"
                    >
                      {auction.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Link href={`/auction/${auction.id}`}>
                  <Button variant="outline" className="rounded-none h-9 px-5 text-sm font-semibold">
                    Open Terminal
                  </Button>
                </Link>

                {isAdmin && auction.status === "SCHEDULED" && (
                  <Button
                    className="rounded-none h-9 px-5 gap-1.5 text-sm font-semibold"
                    onClick={() => startAuction.mutate({ sessionId: auction.id })}
                    disabled={startAuction.isPending}
                  >
                    <Play className="w-3.5 h-3.5" /> Start Live
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
