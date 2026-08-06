import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAuctions,
  useGetMe,
  getListAuctionsQueryKey,
  type ListAuctionsStatus,
  type ListAuctionsCommodityType,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { CreateAuctionDialog } from "@/components/CreateAuctionDialog";
import { Radio } from "lucide-react";

function AuctionCountdown({ endAt }: { endAt: string }) {
  const msLeft = new Date(endAt).getTime() - Date.now();
  if (msLeft <= 0) return <span className="text-red-600 font-medium text-xs">Ended</span>;
  const days = Math.floor(msLeft / 86400000);
  const hours = Math.floor((msLeft % 86400000) / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  const isUrgent = msLeft < 10 * 60 * 1000;
  return (
    <span className={`font-mono text-xs font-semibold ${isUrgent ? "text-red-600" : "text-slate-700"}`}>
      {days > 0 ? `${days}d ` : ""}{hours > 0 ? `${hours}h ` : ""}{mins}m {secs}s
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 border-green-200",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
  SETTLED: "bg-blue-100 text-blue-800 border-blue-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function getGlobalStreamUrl(): string {
  return "/api/auctions/stream";
}

type EnrichedAuction = {
  id: number;
  status: string;
  endAt: string;
  commodityType: string | null;
  grade: string | null;
  warehouseCode: string | null;
  weightMt: string | null;
  reservePriceUsd: string | number;
  currentHighBidUsd: number | null;
  bidCount: number;
  [key: string]: unknown;
};

export default function Auctions() {
  const { data: me } = useGetMe();
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [commodityFilter, setCommodityFilter] = useState<string>("");
  const [liveConnected, setLiveConnected] = useState(false);
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  const queryParams = {
    status: (statusFilter || undefined) as ListAuctionsStatus | undefined,
    commodityType: (commodityFilter || undefined) as ListAuctionsCommodityType | undefined,
  };

  const { data: auctions, isLoading, refetch } = useListAuctions(queryParams);

  const isProducer = me?.tier === "PRODUCER";

  // Patch all cached auction query variants when a bid event arrives
  const patchBidInCache = useCallback((auctionId: number, amountUsd: string) => {
    const amount = parseFloat(amountUsd);

    // Update every cached variant of the auctions list (different filter combos)
    queryClient.setQueriesData<EnrichedAuction[]>(
      { queryKey: getListAuctionsQueryKey() },
      (old) => {
        if (!old) return old;
        return old.map((a) => {
          if (a.id !== auctionId) return a;
          const prevHigh = a.currentHighBidUsd ?? 0;
          return {
            ...a,
            currentHighBidUsd: Math.max(prevHigh, amount),
            bidCount: (a.bidCount ?? 0) + 1,
          };
        });
      }
    );
  }, [queryClient]);

  // Patch status when an auction closes
  const patchClosedInCache = useCallback((auctionId: number) => {
    queryClient.setQueriesData<EnrichedAuction[]>(
      { queryKey: getListAuctionsQueryKey() },
      (old) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === auctionId ? { ...a, status: "CLOSED" } : a
        );
      }
    );
    // Also do a background refetch so closed auctions get filtered out of the
    // "OPEN" view on next render without needing the user to refresh
    refetch();
  }, [queryClient, refetch]);

  // Connect to global SSE stream
  useEffect(() => {
    const es = new EventSource(getGlobalStreamUrl());
    esRef.current = es;

    es.addEventListener("connected", () => {
      setLiveConnected(true);
    });

    es.addEventListener("bid", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as {
          auctionId: number;
          bid: { amountUsd: string };
          newEndAt?: string | null;
        };
        patchBidInCache(payload.auctionId, payload.bid.amountUsd);
      } catch {
        // malformed event: ignore
      }
    });

    es.addEventListener("closed", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as { auctionId: number };
        patchClosedInCache(payload.auctionId);
      } catch {
        // malformed event: ignore
      }
    });

    es.addEventListener("ping", () => {
      // keepalive: no action
    });

    es.onerror = () => {
      setLiveConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
      setLiveConnected(false);
    };
  }, [patchBidInCache, patchClosedInCache]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
              <span
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  liveConnected
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <Radio className="w-3 h-3" />
                {liveConnected ? "Live" : "Connecting…"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">Timed ascending-price auctions for premium micro-lots</p>
          </div>
          {isProducer && <CreateAuctionDialog />}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {(["", "OPEN", "CLOSED", "SETTLED", "CANCELLED"] as const).map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s || "All"}
              </Button>
            ))}
          </div>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={commodityFilter}
            onChange={e => setCommodityFilter(e.target.value)}
          >
            <option value="">All Commodities</option>
            {["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : !auctions?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No auctions found</p>
            <p className="text-sm mt-1">{isProducer ? "Create an auction to start a timed bid." : "Check back when producers list new auctions."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map(auction => (
              <Link key={auction.id} href={`/auctions/${auction.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold">{auction.commodityType ?? "-"} · {auction.grade ?? "-"}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{auction.warehouseCode} · {auction.weightMt} MT</p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[auction.status] ?? ""}`}>
                        {auction.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Reserve</p>
                        <p className="font-semibold text-sm">${Number(auction.reservePriceUsd).toLocaleString()}</p>
                      </div>
                      <div className="bg-primary/5 rounded p-2">
                        <p className="text-xs text-muted-foreground">Current Bid</p>
                        <p className="font-bold text-sm text-primary">
                          {auction.currentHighBidUsd != null
                            ? `$${auction.currentHighBidUsd.toLocaleString()}`
                            : <span className="text-muted-foreground">No bids</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}</span>
                      {auction.status === "OPEN" && <AuctionCountdown endAt={String(auction.endAt)} />}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
