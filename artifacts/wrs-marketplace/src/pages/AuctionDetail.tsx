import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetAuction,
  useListAuctionBids,
  usePlaceBid,
  useGetMe,
  getGetAuctionQueryKey,
  getListAuctionBidsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuctionDetail as AuctionDetailData, AuctionBid } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gavel, Clock, TrendingUp, Users, Radio } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 border-green-200",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
  SETTLED: "bg-blue-100 text-blue-800 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function Countdown({ endAt, status }: { endAt: string; status: string }) {
  const [msLeft, setMsLeft] = useState(new Date(endAt).getTime() - Date.now());

  useEffect(() => {
    if (status !== "OPEN") return;
    const id = setInterval(() => setMsLeft(new Date(endAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endAt, status]);

  if (status !== "OPEN") return <span className="text-muted-foreground font-medium">Closed</span>;
  if (msLeft <= 0) return <span className="text-red-600 font-bold">Ended</span>;

  const days = Math.floor(msLeft / 86400000);
  const hours = Math.floor((msLeft % 86400000) / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  const isUrgent = msLeft < 5 * 60 * 1000;

  return (
    <div className={`font-mono text-2xl font-bold ${isUrgent ? "text-red-600 animate-pulse" : "text-amber-700"}`}>
      {days > 0 ? `${days}d ` : ""}{hours > 0 ? `${String(hours).padStart(2, "0")}:` : "00:"}{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      {isUrgent && <span className="text-xs ml-2 font-normal text-red-500">⚡ Anti-snipe active</span>}
    </div>
  );
}

// Build the SSE stream URL using the same base path as the API client
function getStreamUrl(auctionId: number): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/auctions/${auctionId}/stream`;
}

export default function AuctionDetail() {
  const [, params] = useRoute("/auctions/:auctionId");
  const [, navigate] = useLocation();
  const auctionId = parseInt(params?.auctionId ?? "");
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const [bidAmount, setBidAmount] = useState("");
  const bidInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [liveConnected, setLiveConnected] = useState(false);

  const { data: detail, isLoading, refetch: refetchDetail } = useGetAuction(auctionId);
  const { data: bids, refetch: refetchBids } = useListAuctionBids(auctionId);

  const { mutateAsync: placeBid, isPending: isBidding } = usePlaceBid();

  const isOffTaker = me?.tier === "OFF_TAKER";
  const auction = detail?.auction;

  // ── SSE connection ──────────────────────────────────────────────────────────
  const setupSse = useCallback(() => {
    if (isNaN(auctionId)) return;

    const es = new EventSource(getStreamUrl(auctionId));

    es.addEventListener("connected", () => {
      setLiveConnected(true);
    });

    es.addEventListener("bid", (e: MessageEvent) => {
      try {
        const { bid, antiSnipeTriggered, newEndAt } = JSON.parse(e.data) as {
          bid: {
            id: number;
            auctionId: number;
            bidderId: number;
            bidderName: string | null;
            amountUsd: string;
            placedAt: string;
            isWinning: boolean;
          };
          antiSnipeTriggered: boolean;
          newEndAt: string | null;
        };

        // Prepend new bid to cached bids list (sorted by placedAt desc)
        queryClient.setQueryData<AuctionBid[]>(
          getListAuctionBidsQueryKey(auctionId),
          (old) => {
            if (!old) return [bid];
            // Mark previous bids as not winning, prepend new bid
            return [bid, ...old.map(b => ({ ...b, isWinning: false }))];
          }
        );

        // Update cached auction detail to reflect new high bid, bid count, and endAt
        queryClient.setQueryData<AuctionDetailData>(
          getGetAuctionQueryKey(auctionId),
          (old) => {
            if (!old) return old;
            const prevHigh = old.auction.currentHighBidUsd ?? 0;
            const newHigh = Math.max(prevHigh, parseFloat(bid.amountUsd));
            return {
              ...old,
              auction: {
                ...old.auction,
                currentHighBidUsd: newHigh,
                bidCount: (old.auction.bidCount ?? 0) + 1,
                winningBidId: bid.id,
                ...(newEndAt ? { endAt: newEndAt } : {}),
              },
            };
          }
        );

        if (antiSnipeTriggered) {
          toast({
            title: "⚡ Anti-snipe triggered",
            description: "A bid was placed in the final 3 minutes — auction extended by 3 minutes.",
          });
        }
      } catch {
        // malformed event — ignore
      }
    });

    es.addEventListener("closed", () => {
      // Auction just closed — refresh from server to get the final state
      refetchDetail();
      refetchBids();
      setLiveConnected(false);
    });

    es.addEventListener("ping", () => {
      // keepalive — no action needed
    });

    es.onerror = () => {
      setLiveConnected(false);
      // EventSource auto-reconnects; mark disconnected until "connected" event fires again
    };

    return es;
  }, [auctionId, queryClient, refetchDetail, refetchBids, toast]);

  useEffect(() => {
    const es = setupSse();
    return () => {
      es?.close();
      setLiveConnected(false);
    };
  }, [setupSse]);

  // ───────────────────────────────────────────────────────────────────────────

  const minNextBid = () => {
    if (!auction) return 0;
    const high = auction.currentHighBidUsd ?? null;
    if (high === null) return parseFloat(String(auction.reservePriceUsd));
    return high * (1 + parseFloat(String(auction.bidIncrementPct)) / 100);
  };

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    const min = minNextBid();
    if (isNaN(amount) || amount < min) {
      toast({ title: "Bid too low", description: `Minimum bid is $${min.toFixed(2)}`, variant: "destructive" });
      return;
    }
    try {
      await placeBid({ auctionId, data: { amountUsd: amount } });
      setBidAmount("");
      toast({ title: "Bid placed!", description: `Your bid of $${amount.toLocaleString()} has been placed.` });
      // SSE event from server will update the UI; do a full refetch as safety net
      refetchDetail();
      refetchBids();
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.message ?? "Failed to place bid";
      toast({ title: "Bid failed", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!auction) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Auction not found.</p>
          <Button asChild variant="link" className="mt-2"><Link href="/auctions">← Back to Auctions</Link></Button>
        </div>
      </Layout>
    );
  }

  const minBid = minNextBid();

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auctions"><ArrowLeft className="w-4 h-4 mr-1" />Auctions</Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-sm">Auction #{auction.id}</span>
          {auction.status === "OPEN" && (
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${liveConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
              <Radio className="w-3 h-3" />
              {liveConnected ? "Live" : "Connecting…"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{auction.commodityType} · {auction.grade}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{auction.warehouseCode} · {auction.weightMt} MT · Seller: {auction.sellerName}</p>
                  </div>
                  <Badge variant="outline" className={`${STATUS_COLORS[auction.status]}`}>{auction.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Reserve</p>
                    <p className="text-lg font-bold">${parseFloat(String(auction.reservePriceUsd)).toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Current High</p>
                    <p className="text-lg font-bold text-primary">
                      {auction.currentHighBidUsd != null
                        ? `$${auction.currentHighBidUsd.toLocaleString()}`
                        : "No bids"}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Min Increment</p>
                    <p className="text-lg font-bold">{auction.bidIncrementPct}%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Total Bids</p>
                    <p className="text-lg font-bold flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" />{auction.bidCount}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-700 font-medium">Time Remaining</p>
                    <Countdown endAt={String(auction.endAt)} status={auction.status} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Bid History</CardTitle>
              </CardHeader>
              <CardContent>
                {!bids?.length ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No bids yet. Be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {bids.map((bid, i) => (
                      <div key={bid.id} className={`flex items-center justify-between p-3 rounded-lg border ${bid.isWinning ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{bid.bidderName ?? `Bidder #${bid.bidderId}`}</p>
                            <p className="text-xs text-muted-foreground">{new Date(bid.placedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${bid.isWinning ? "text-primary text-lg" : "text-sm"}`}>
                            ${parseFloat(String(bid.amountUsd)).toLocaleString()}
                          </p>
                          {bid.isWinning && <span className="text-xs text-primary font-semibold">Leading</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {isOffTaker && auction.status === "OPEN" && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary"><Gavel className="w-4 h-4" />Place Bid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Minimum bid</p>
                    <p className="text-xl font-bold text-primary">${minBid.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                      <Input
                        ref={bidInputRef}
                        type="number"
                        placeholder={minBid.toFixed(2)}
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        min={minBid}
                        step="0.01"
                        className="pl-7"
                        onKeyDown={e => e.key === "Enter" && handleBid()}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleBid}
                      disabled={isBidding || !bidAmount}
                    >
                      {isBidding ? "Placing Bid…" : "Place Bid"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bids placed within the final 3 minutes extend the auction by 3 minutes (anti-snipe rule).
                  </p>
                </CardContent>
              </Card>
            )}

            {!isOffTaker && auction.status === "OPEN" && (
              <Card>
                <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                  Only Off-Taker accounts can place bids.
                </CardContent>
              </Card>
            )}

            {auction.status !== "OPEN" && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="font-medium text-sm">Auction {auction.status.toLowerCase()}</p>
                  {auction.status === "SETTLED" && auction.currentHighBidUsd && (
                    <p className="text-2xl font-bold text-primary mt-2">${auction.currentHighBidUsd.toLocaleString()}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm">eWR Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commodity</span>
                  <span className="font-medium">{auction.commodityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade</span>
                  <span className="font-medium">{auction.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-medium">{auction.weightMt} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouse</span>
                  <span className="font-medium">{auction.warehouseCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">eWR #</span>
                  <span className="font-mono text-xs">{auction.ewrId}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
