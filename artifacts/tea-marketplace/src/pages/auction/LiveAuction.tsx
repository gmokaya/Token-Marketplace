import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  useGetTeaAuctionSession,
  getGetTeaAuctionSessionQueryKey,
  usePlaceTeaLotBid,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Gavel, Clock, AlertCircle } from "lucide-react";

/** Maps a bidder ID to a stable anonymized label ("Buyer A", "Buyer B", …) */
function anonymize(bidderId: number | string, registry: Map<string, string>): string {
  const key = String(bidderId);
  if (!registry.has(key)) {
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    registry.set(key, `Buyer ${labels[registry.size % labels.length]}`);
  }
  return registry.get(key)!;
}

interface BidEntry {
  id: number;
  amountUsd: number;
  buyerLabel: string;
  timestamp: string;
  lotId: number;
}

export default function LiveAuction() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useGetMe();

  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidLog, setBidLog] = useState<BidEntry[]>([]);
  const [buyerRegistry] = useState<Map<string, string>>(() => new Map());

  const { data: session, isLoading, isError } = useGetTeaAuctionSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetTeaAuctionSessionQueryKey(sessionId),
    },
  });

  const placeBid = usePlaceTeaLotBid({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bid placed successfully" });
        setBidAmount("");
        queryClient.invalidateQueries({ queryKey: getGetTeaAuctionSessionQueryKey(sessionId) });
      },
      onError: (err: any) => {
        toast({ title: "Bid rejected", description: err?.message ?? "Try again", variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const apiBase = basePath.replace(/^\/tea/, "");
    const es = new EventSource(`${apiBase}/api/auctions/stream`);

    es.addEventListener("bid", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.commodity === "TEA") {
          queryClient.invalidateQueries({ queryKey: getGetTeaAuctionSessionQueryKey(sessionId) });
          if (data.lotId != null && data.amountUsd != null && data.bidderId != null) {
            setBidLog((prev) =>
              [
                {
                  id: Date.now(),
                  amountUsd: data.amountUsd,
                  buyerLabel: anonymize(data.bidderId, buyerRegistry),
                  timestamp: new Date().toLocaleTimeString(),
                  lotId: data.lotId,
                },
                ...prev,
              ].slice(0, 50)
            );
          }
        }
      } catch (_) {}
    });

    return () => es.close();
  }, [sessionId, queryClient, buyerRegistry]);

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (isError || !session) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="w-6 h-6 mr-3" />
        <span>Session not found or failed to load.</span>
      </div>
    );
  }

  const currentLotId = session.currentLotId;
  const lots: any[] = (session as any).lots || [];
  const currentLot = lots.find((l) => l.id === currentLotId);

  const handleBid = () => {
    if (!currentLotId) return;
    const amountUsd = parseFloat(bidAmount);
    if (isNaN(amountUsd) || amountUsd <= 0) return;
    placeBid.mutate({ lotId: currentLotId, data: { amountUsd } });
  };

  const isOffTaker = user?.tier === "OFF_TAKER";

  // Bids relevant to the current lot for the history panel
  const currentLotBids = bidLog.filter((b) => b.lotId === currentLotId);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 overflow-hidden">
      {/* Main Auction Stage */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Card className="rounded-none border-border shadow-none flex-1 flex flex-col bg-card overflow-hidden">
          <CardHeader className="border-b bg-muted/10 p-6 flex flex-row items-center justify-between shrink-0">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Gavel className="w-6 h-6" /> Live Tea Auction
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Session #{session.id}
              </p>
            </div>
            <Badge
              variant={session.status === "LIVE" ? "destructive" : "secondary"}
              className="rounded-none text-sm px-3 py-1"
            >
              {session.status}
            </Badge>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {currentLot ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Lot header */}
                <div className="bg-primary/5 border-b p-8 text-center relative shrink-0">
                  {currentLot.secsRemaining != null && currentLot.secsRemaining <= 15 && (
                    <div className="absolute inset-0 bg-destructive/10 animate-pulse pointer-events-none" />
                  )}
                  <h2 className="text-5xl font-black font-mono tracking-tight mb-2">
                    {currentLot.grade}
                  </h2>
                  <p className="text-xl text-muted-foreground font-medium">
                    {currentLot.gradeMark} • {currentLot.giOrigin}
                  </p>
                  <div className="mt-8 flex justify-center gap-12">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">Weight</div>
                      <div className="text-3xl font-bold">{currentLot.netWeightKg} kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">Reserve</div>
                      <div className="text-3xl font-bold">
                        ${currentLot.reservePriceUsd?.toFixed(2)}/kg
                      </div>
                    </div>
                    {currentLot.secsRemaining != null && (
                      <div className="text-center text-destructive">
                        <div className="text-sm uppercase font-bold tracking-widest mb-1 flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4" /> Time
                        </div>
                        <div className="text-3xl font-bold font-mono">{currentLot.secsRemaining}s</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bid area + history */}
                <div className="p-6 flex-1 flex gap-6 overflow-hidden">
                  {/* Current high bid + entry */}
                  <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="text-center mb-8">
                      <div className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-2">
                        Current High Bid
                      </div>
                      <div className="text-6xl font-black text-primary">
                        ${currentLot.currentHighBidUsd?.toFixed(2) ?? "0.00"}
                      </div>
                      <div className="text-muted-foreground mt-2 font-medium">
                        {currentLot.bidCount ?? 0} bids placed
                      </div>
                    </div>
                    {session.status === "LIVE" && isOffTaker && (
                      <div className="w-full max-w-md flex flex-col gap-4">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`Min: $${(currentLot.minNextBidUsd ?? currentLot.reservePriceUsd)?.toFixed(2)}`}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="h-14 text-xl font-mono text-center rounded-none"
                          />
                          <Button
                            onClick={handleBid}
                            disabled={placeBid.isPending || !bidAmount}
                            className="h-14 px-8 text-lg font-bold rounded-none"
                          >
                            PLACE BID
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[0.01, 0.05, 0.1].map((inc) => {
                            const nextBid =
                              (currentLot.currentHighBidUsd ?? currentLot.reservePriceUsd ?? 0) + inc;
                            return (
                              <Button
                                key={inc}
                                variant="outline"
                                onClick={() =>
                                  placeBid.mutate({ lotId: currentLot.id, data: { amountUsd: nextBid } })
                                }
                                className="rounded-none font-mono"
                                disabled={placeBid.isPending}
                              >
                                +${inc.toFixed(2)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bid history panel (anonymized) */}
                  <div className="w-64 flex flex-col border border-border">
                    <div className="bg-muted/20 border-b px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Bid Activity
                      </p>
                    </div>
                    <ScrollArea className="flex-1">
                      {currentLotBids.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No bids yet for this lot.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {currentLotBids.map((entry) => (
                            <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{entry.buyerLabel}</p>
                                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                              </div>
                              <span className="font-mono text-sm font-bold text-primary">
                                ${entry.amountUsd.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Gavel className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium">Waiting for next lot</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Catalogue Order */}
      <div className="w-72 flex flex-col gap-4 overflow-hidden">
        <Card className="rounded-none flex-1 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/20 border-b p-4 shrink-0">
            <CardTitle className="text-sm uppercase tracking-wider">Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden flex-1">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {lots.map((lot, i) => {
                  const isCurrent = lot.id === currentLotId;
                  return (
                    <div
                      key={lot.id}
                      className={`p-4 ${isCurrent ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/5"}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold font-mono text-sm">Lot {i + 1}</span>
                        <Badge variant="outline" className="rounded-none text-[10px]">
                          {lot.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">
                        {lot.grade} • {lot.gradeMark}
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between mt-1">
                        <span>{lot.netWeightKg} kg</span>
                        {lot.currentHighBidUsd != null ? (
                          <span className="font-bold text-foreground">
                            ${lot.currentHighBidUsd.toFixed(2)}
                          </span>
                        ) : (
                          <span>Res: ${lot.reservePriceUsd?.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
