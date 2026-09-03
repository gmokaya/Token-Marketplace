import { FormEvent, useState } from "react";
import { Link, useParams } from "wouter";
import { getGetAuctionQueryKey, useGetAuction, usePlaceBid } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Gavel, Loader2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function LiveAuction() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const id = Number(auctionId);
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetAuction(id, {
    query: {
      queryKey: getGetAuctionQueryKey(id),
      enabled: Number.isFinite(id) && id > 0,
      refetchInterval: (query) => query.state.data?.auction.status === "OPEN" ? 2000 : false,
    },
  });
  const placeBid = usePlaceBid();

  const handleBid = (event: FormEvent) => {
    event.preventDefault();
    const bid = Number(amount);
    if (!Number.isFinite(bid) || bid <= 0) {
      toast({ title: "Enter a valid bid", description: "Bids must be a positive USD amount.", variant: "destructive" });
      return;
    }
    placeBid.mutate(
      { auctionId: id, data: { amountUsd: bid } },
      {
        onSuccess: () => {
          setAmount("");
          toast({ title: "Bid placed", description: `Your bid of $${bid.toLocaleString()} is recorded.` });
          queryClient.invalidateQueries({ queryKey: getGetAuctionQueryKey(id) });
        },
        onError: (error: any) => toast({ title: "Bid failed", description: error?.error ?? error?.message ?? "Could not place bid.", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <Skeleton className="mx-auto h-[560px] w-full max-w-5xl" />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">Auction not found.</div>;

  const { auction, ewr, bids } = data;
  const isOpen = auction.status === "OPEN";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/auctions"><Button variant="ghost" size="icon" aria-label="Back to auctions"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Grain Auction #{auction.id}</h1>
          <Badge variant="outline" className={isOpen ? "animate-pulse border-red-500/30 bg-red-500/10 text-red-700" : ""}>{auction.status}</Badge>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" /> Lot on the block</CardTitle>
            <CardDescription>{auction.commodityType} · {auction.grade ?? "Certified grain"} · {ewr?.weightMt ?? auction.weightMt ?? "—"} MT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-7">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current high bid</p>
              <p className="mt-1 font-mono text-5xl font-bold tracking-tight">{auction.currentHighBidUsd != null ? `$${Number(auction.currentHighBidUsd).toLocaleString()}` : "No bids"}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Closes {new Date(auction.endAt).toLocaleString()}</p>
            </div>
            {isOpen && (
              <form onSubmit={handleBid} className="mx-auto flex max-w-md gap-2">
                <Input type="number" min="0.01" step="0.01" placeholder="Bid amount in USD" value={amount} onChange={(event) => setAmount(event.target.value)} className="font-mono" />
                <Button type="submit" disabled={placeBid.isPending}>{placeBid.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Bid</Button>
              </form>
            )}
            <p className="text-center text-xs text-muted-foreground">Reserve: ${Number(auction.reservePriceUsd).toLocaleString()} · Minimum increment: {auction.bidIncrementPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4" /> Bid history</CardTitle><CardDescription>{bids.length} bid{bids.length === 1 ? "" : "s"}</CardDescription></CardHeader>
          <CardContent>
            {bids.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Waiting for the first bid.</p> : <div className="space-y-2">{bids.map((bid) => <div key={bid.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span className="truncate text-muted-foreground">{bid.bidderName ?? `Bidder #${bid.bidderId}`}</span><span className="font-mono font-semibold">${Number(bid.amountUsd).toLocaleString()}</span></div>)}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}