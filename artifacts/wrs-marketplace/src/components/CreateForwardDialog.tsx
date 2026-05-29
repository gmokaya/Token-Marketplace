import { useState } from "react";
import { useCreateForwardContract, useGetMyPortfolio } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FilePlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function CreateForwardDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: portfolio } = useGetMyPortfolio();

  const [ewrId, setEwrId] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const { mutateAsync: createForward, isPending } = useCreateForwardContract();

  const eligibleEwrs = portfolio?.ewrs.filter(e => ["INGESTED", "ENCUMBERED"].includes(e.state)) ?? [];

  const bondAmount = deliveryPrice ? (parseFloat(deliveryPrice) * 0.15).toFixed(2) : null;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewrId || !deliveryPrice || !maturityDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    try {
      await createForward({
        data: {
          ewrId: parseInt(ewrId),
          deliveryPriceUsd: parseFloat(deliveryPrice),
          maturityDate: new Date(maturityDate).toISOString(),
        },
      });
      toast({ title: "Forward contract created!", description: "Awaiting buyer co-signature." });
      queryClient.invalidateQueries({ queryKey: ["/forwards"] });
      setOpen(false);
      setEwrId("");
      setDeliveryPrice("");
      setMaturityDate("");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to create contract";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FilePlus className="w-4 h-4" />
          Create Forward Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Forward Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fwdEwrId">eWR to Forward</Label>
            <select
              id="fwdEwrId"
              className="w-full border rounded px-3 py-2 text-sm bg-background"
              value={ewrId}
              onChange={e => setEwrId(e.target.value)}
              required
            >
              <option value="">Select an eWR…</option>
              {eligibleEwrs.map(ewr => (
                <option key={ewr.id} value={ewr.id}>
                  {ewr.ewrsReceiptId} — {ewr.commodityType} {ewr.grade} {ewr.weightMt}MT
                </option>
              ))}
            </select>
            {!eligibleEwrs.length && (
              <p className="text-xs text-muted-foreground">No eligible eWRs found.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryPrice">Agreed Delivery Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="deliveryPrice"
                type="number"
                placeholder="e.g. 52000"
                value={deliveryPrice}
                onChange={e => setDeliveryPrice(e.target.value)}
                min={1}
                step="0.01"
                className="pl-7"
                required
              />
            </div>
            {bondAmount && (
              <p className="text-xs text-muted-foreground">
                Performance bond (15% each party): <strong>${bondAmount}</strong>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maturityDate">Maturity Date</Label>
            <Input
              id="maturityDate"
              type="date"
              value={maturityDate}
              onChange={e => setMaturityDate(e.target.value)}
              min={minDateStr}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
            Once an off-taker co-signs, both parties post a 15% performance bond. The eWR will be encumbered until maturity or default resolution.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !eligibleEwrs.length}>
              {isPending ? "Creating…" : "Create Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
