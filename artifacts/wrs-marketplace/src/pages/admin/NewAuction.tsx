import { useState } from "react";
import { useCreateAuction, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gavel, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: me, isLoading: meLoading } = useGetMe();

  const [ewrId, setEwrId] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [bidIncrementPct, setBidIncrementPct] = useState("2");
  const [submitted, setSubmitted] = useState(false);

  const create = useCreateAuction();

  if (meLoading) {
    return <Layout><Skeleton className="h-64 w-full max-w-xl mx-auto" /></Layout>;
  }

  if (me?.tier !== "ADMIN") {
    setLocation("/admin/auctions", { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ewrIdNum = parseInt(ewrId, 10);
    const reserveNum = parseFloat(reservePrice);
    const durationNum = parseInt(durationMinutes, 10);
    const bidPct = parseFloat(bidIncrementPct);

    if (!ewrIdNum || isNaN(ewrIdNum)) {
      toast({ title: "eWR ID required", description: "Enter a valid eWR ID.", variant: "destructive" });
      return;
    }
    if (!reserveNum || reserveNum <= 0) {
      toast({ title: "Reserve price required", description: "Enter a positive reserve price.", variant: "destructive" });
      return;
    }
    if (!durationNum || durationNum < 5 || durationNum > 1440) {
      toast({ title: "Invalid duration", description: "Duration must be between 5 and 1440 minutes.", variant: "destructive" });
      return;
    }

    create.mutate(
      { data: { ewrId: ewrIdNum, reservePriceUsd: reserveNum, durationMinutes: durationNum, bidIncrementPct: bidPct } },
      {
        onSuccess: (auction: any) => {
          toast({ title: "Auction created", description: `Auction #${auction.id} is now open for bidding.` });
          setSubmitted(true);
        },
        onError: (err: any) => {
          toast({ title: "Failed to create auction", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <Card className="border-green-200 bg-green-50/40">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
              <div>
                <h2 className="text-xl font-bold tracking-tight text-green-900">Auction Live</h2>
                <p className="text-sm text-green-700 mt-1.5">
                  The auction is now open. Buyers can place bids immediately.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Link href="/admin/auctions">
                  <Button variant="outline">View All Auctions</Button>
                </Link>
                <Button onClick={() => { setSubmitted(false); setEwrId(""); setReservePrice(""); }}>
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-4">
          <Link href="/admin/auctions">
            <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Auction</h1>
            <p className="text-muted-foreground mt-1">Create a live eWR auction on the grain platform.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gavel className="w-4 h-4" /> Auction Details
              </CardTitle>
              <CardDescription>
                The eWR must be INGESTED and unencumbered. The auction opens immediately once created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ewrId">eWR ID</Label>
                <Input
                  id="ewrId"
                  type="number"
                  min="1"
                  placeholder="e.g. 42"
                  value={ewrId}
                  onChange={e => setEwrId(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">The ID of the electronic Warehouse Receipt to auction.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reservePrice">Reserve Price (USD)</Label>
                  <Input
                    id="reservePrice"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={reservePrice}
                    onChange={e => setReservePrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="1440"
                    placeholder="60"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidIncrement">Bid Increment (%)</Label>
                <Input
                  id="bidIncrement"
                  type="number"
                  min="0.5"
                  max="25"
                  step="0.5"
                  placeholder="2"
                  value={bidIncrementPct}
                  onChange={e => setBidIncrementPct(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Minimum percentage each new bid must exceed the previous. Default 2%.</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t px-6 py-4">
              <Button type="submit" className="ml-auto gap-2" disabled={create.isPending}>
                {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Open Auction
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
