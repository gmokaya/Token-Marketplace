import { useParams } from "wouter";
import { useGetTeaAuctionSession, usePlaceTeaLotBid } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Clock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTeaAuctionSessionQueryKey } from "@workspace/api-client-react";

export default function LiveAuction() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [bidAmount, setBidAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Poll every 2 seconds if session is LIVE
  const { data: sessionData, isLoading } = useGetTeaAuctionSession(Number(sessionId), { 
    query: { 
      enabled: !!sessionId,
      refetchInterval: (query) => query.state.data?.status === 'LIVE' ? 2000 : false
    } 
  });

  const placeBid = usePlaceTeaLotBid();

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData?.currentLotId) return;
    
    const amount = Number(bidAmount);
    if (!amount || isNaN(amount)) return;

    placeBid.mutate(
      {
        sessionId: Number(sessionId),
        lotId: sessionData.currentLotId,
        data: { amountUsd: amount }
      },
      {
        onSuccess: () => {
          toast({ title: "Bid Placed", description: `Successfully bid $${amount} / MT` });
          setBidAmount("");
          queryClient.invalidateQueries({ queryKey: getGetTeaAuctionSessionQueryKey(Number(sessionId)) });
        },
        onError: (err) => {
          toast({ title: "Bid Failed", description: err.error || "Could not place bid", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto"><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!sessionData) {
    return <div className="text-center py-12">Session not found</div>;
  }

  // Find the currently active lot from the session's lots array (assuming it's returned enriched)
  // Or we just display general session info if currentLotId is null
  
  const isLive = sessionData.status === 'LIVE';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Auction Room #{sessionData.id}</h1>
            <Badge variant="outline" className={isLive ? "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse" : ""}>
              {isLive ? "LIVE NOW" : sessionData.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Managed by {sessionData.brokerName || `Broker ${sessionData.createdByBrokerId}`}</p>
        </div>
        {isLive && (
          <div className="text-right flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-6 h-6 text-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-accent/20 shadow-md">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-accent" /> Active Lot on the Block
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {sessionData.currentLotId ? (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <h2 className="text-4xl font-mono font-bold tracking-tighter mb-2">Lot #{sessionData.currentLotId}</h2>
                    <p className="text-muted-foreground">Accepting bids now.</p>
                  </div>
                  
                  {isLive && (
                    <form onSubmit={handleBid} className="max-w-sm mx-auto space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                          <Input 
                            type="number" 
                            className="pl-7 font-mono text-lg h-12" 
                            placeholder="Enter bid / MT"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            min="1"
                          />
                        </div>
                        <Button type="submit" size="lg" className="h-12 px-8 bg-accent hover:bg-accent/90 text-accent-foreground font-bold" disabled={placeBid.isPending}>
                          Place Bid
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Waiting for broker to bring next lot to the block...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catalogue Order</CardTitle>
              <CardDescription>Lots to be auctioned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessionData.catalogueOrder?.map((lotId, idx) => (
                  <div key={lotId} className={`p-3 rounded-lg border text-sm flex items-center justify-between ${sessionData.currentLotId === lotId ? 'border-accent bg-accent/5 font-medium' : 'border-border bg-muted/30 text-muted-foreground'}`}>
                    <span>{idx + 1}. Lot #{lotId}</span>
                    {sessionData.currentLotId === lotId && <span className="text-xs text-accent">Active</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
