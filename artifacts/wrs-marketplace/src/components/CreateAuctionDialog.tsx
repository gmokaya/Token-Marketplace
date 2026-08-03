import { useState } from "react";
import { useCreateAuction, useGetMyPortfolio } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gavel } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function CreateAuctionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: portfolio } = useGetMyPortfolio();

  const [ewrId, setEwrId] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [bidIncrement, setBidIncrement] = useState("1.5");
  const [durationMinutes, setDurationMinutes] = useState("60");

  const { mutateAsync: createAuction, isPending } = useCreateAuction();

  const ingestedEwrs = portfolio?.ewrs.filter(e => e.state === "INGESTED") ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewrId || !reservePrice || !durationMinutes) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    try {
      await createAuction({
        data: {
          ewrId: parseInt(ewrId),
          reservePriceUsd: parseFloat(reservePrice),
          bidIncrementPct: parseFloat(bidIncrement) || 1.5,
          durationMinutes: parseInt(durationMinutes),
        },
      });
      toast({ title: "Auction created!", description: "Your auction is now live." });
      queryClient.invalidateQueries({ queryKey: ["/auctions"] });
      setOpen(false);
      setEwrId("");
      setReservePrice("");
      setDurationMinutes("60");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to create auction";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Gavel className="w-4 h-4" />
          Create Auction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Live Auction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ewrId">eWR to Auction</Label>
            <select
              id="ewrId"
              className="w-full border rounded px-3 py-2 text-sm bg-background"
              value={ewrId}
              onChange={e => setEwrId(e.target.value)}
              required
            >
              <option value="">Select an eWR…</option>
              {ingestedEwrs.map(ewr => (
                <option key={ewr.id} value={ewr.id}>
                  {ewr.ewrsReceiptId} - {ewr.commodityType} {ewr.grade} {ewr.weightMt}MT @ {ewr.warehouseCode}
                </option>
              ))}
            </select>
            {!ingestedEwrs.length && (
              <p className="text-xs text-muted-foreground">No INGESTED eWRs available. eWRs must be in INGESTED state to auction.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reservePrice">Reserve Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="reservePrice"
                type="number"
                placeholder="e.g. 45000"
                value={reservePrice}
                onChange={e => setReservePrice(e.target.value)}
                min={1}
                step="0.01"
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bidIncrement">Min Bid Increment (%)</Label>
              <Input
                id="bidIncrement"
                type="number"
                value={bidIncrement}
                onChange={e => setBidIncrement(e.target.value)}
                min={0.1}
                max={50}
                step={0.1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                min={5}
                max={10080}
                required
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
            Bids placed within the final 3 minutes will extend the auction by 3 minutes (anti-snipe protection).
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !ingestedEwrs.length}>
              {isPending ? "Creating…" : "Create Auction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
