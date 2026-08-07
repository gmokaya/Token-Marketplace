import { useListCoffeeAuctionSessions, useStartCoffeeAuctionSession, useGetMe, getListCoffeeAuctionSessionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, Gavel, CalendarDays, Clock, Play } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLOR: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  LIVE: "destructive",
  CLOSED: "outline",
  COMPLETED: "outline",
};

export default function AdminAuctions() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = me?.tier === "ADMIN";

  const { data: sessions, isLoading } = useListCoffeeAuctionSessions();

  const startSession = useStartCoffeeAuctionSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoffeeAuctionSessionsQueryKey() });
        toast({ title: "Session is now live", description: "Bidding has opened." });
      },
      onError: (err: any) => {
        toast({ title: "Failed to start", description: err?.error ?? "Try again.", variant: "destructive" });
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auction Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor coffee auction sessions.</p>
        </div>
        {isAdmin && (
          <Link href="/admin/auctions/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> Schedule Session</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-4 h-4" /> All Sessions ({(sessions ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (sessions ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gavel className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No auction sessions scheduled yet.</p>
              {isAdmin && (
                <Link href="/admin/auctions/new">
                  <Button variant="outline" className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Schedule First Session
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {(sessions ?? []).map((session: any) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="shrink-0">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Session</span>
                      <p className="text-xl font-bold font-mono leading-tight">#{session.id}</p>
                    </div>

                    <div className="h-8 w-px bg-border shrink-0" />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono font-medium">
                          {session.auctionDate
                            ? format(new Date(session.auctionDate + "T12:00:00"), "EEE, MMM d yyyy")
                            : "TBD"}
                        </span>
                        {session.scheduledStartTime && (
                          <>
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
                            <span className="font-mono text-muted-foreground">{session.scheduledStartTime}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          <span className="font-semibold text-foreground">
                            {(session.catalogueOrder as number[] ?? []).length}
                          </span> lots in catalogue
                        </span>
                        <Badge
                          variant={STATUS_COLOR[session.status] ?? "secondary"}
                          className="text-[10px] tracking-wider uppercase px-2 py-0"
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Link href={`/auction/${session.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        Open Terminal
                      </Button>
                    </Link>
                    {isAdmin && session.status === "SCHEDULED" && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={startSession.isPending}
                        onClick={() => startSession.mutate({ sessionId: session.id })}
                      >
                        <Play className="w-3.5 h-3.5" /> Start Live
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
