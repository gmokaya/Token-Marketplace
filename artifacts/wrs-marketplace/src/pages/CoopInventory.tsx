import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListEwrs, useGetMe, useSplitEwr, useRetireEwr, useTransferEwr, useCreateSpotListing, getListEwrsQueryKey, getListSpotListingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Scissors, Flame, ArrowRightLeft, ShoppingBag } from "lucide-react";

const ACCENT = "hsl(155 100% 18%)";

const STATE_COLORS: Record<string, string> = {
  INGESTED: "bg-green-100 text-green-800",
  MARKET_LISTED: "bg-blue-100 text-blue-800",
  AUCTION_ACTIVE: "bg-sky-100 text-sky-800",
  ENCUMBERED: "bg-orange-100 text-orange-800",
  EXTINGUISHED: "bg-gray-100 text-gray-500",
};

export default function CoopInventory() {
  const { data: me } = useGetMe();
  const { data: ewrs, isLoading } = useListEwrs(
    me?.id ? { ownerId: me.id } : {},
    { query: { enabled: !!me?.id } as any }
  );
  const { mutateAsync: splitEwr, isPending: splitting } = useSplitEwr();
  const { mutateAsync: retireEwr, isPending: retiring } = useRetireEwr();
  const { mutateAsync: transferEwr, isPending: transferring } = useTransferEwr();
  const { mutateAsync: createListing, isPending: listing } = useCreateSpotListing();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [splitOpen, setSplitOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [activeEwr, setActiveEwr] = useState<number | null>(null);
  const [activeWeight, setActiveWeight] = useState(0);
  const [splitA, setSplitA] = useState("");
  const [pricePerMt, setPricePerMt] = useState("");
  const [toUserId, setToUserId] = useState("");

  const activeEwrs = (ewrs ?? []).filter(e => !["SETTLED", "EXTINGUISHED"].includes(e.state));

  function openSplit(id: number, weight: number) {
    setActiveEwr(id); setActiveWeight(weight); setSplitA(""); setSplitOpen(true);
  }
  function openRetire(id: number) {
    setActiveEwr(id); setRetireOpen(true);
  }
  function openTransfer(id: number) {
    setActiveEwr(id); setToUserId(""); setTransferOpen(true);
  }
  function openList(id: number) {
    setActiveEwr(id); setPricePerMt(""); setListOpen(true);
  }

  async function handleSplit() {
    const a = parseFloat(splitA);
    if (isNaN(a) || a <= 0 || a >= activeWeight) {
      toast({ title: "Invalid Split", description: `Weight A must be between 0 and ${activeWeight} MT.`, variant: "destructive" });
      return;
    }
    const b = activeWeight - a;
    try {
      await splitEwr({ ewrId: activeEwr!, data: { weightMtA: a, weightMtB: parseFloat(b.toFixed(3)) } });
      await qc.invalidateQueries({ queryKey: getListEwrsQueryKey() });
      toast({ title: "eWR Split", description: `Two child receipts created: ${a.toFixed(2)} MT and ${b.toFixed(2)} MT.` });
      setSplitOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  async function handleRetire() {
    try {
      await retireEwr({ ewrId: activeEwr! });
      await qc.invalidateQueries({ queryKey: getListEwrsQueryKey() });
      toast({ title: "eWR Retired", description: "The receipt has been extinguished for physical withdrawal." });
      setRetireOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  async function handleTransfer() {
    const recipientId = parseInt(toUserId);
    if (isNaN(recipientId) || recipientId <= 0) {
      toast({ title: "Invalid Recipient", description: "Enter a valid numeric user ID.", variant: "destructive" });
      return;
    }
    try {
      await transferEwr({ ewrId: activeEwr!, data: { toUserId: recipientId } });
      await qc.invalidateQueries({ queryKey: getListEwrsQueryKey() });
      toast({ title: "eWR Transferred", description: `Ownership transferred to user #${recipientId}.` });
      setTransferOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  async function handleList() {
    if (!pricePerMt || isNaN(parseFloat(pricePerMt))) {
      toast({ title: "Validation Error", description: "Enter a valid price per MT.", variant: "destructive" });
      return;
    }
    try {
      await createListing({ data: { ewrId: activeEwr!, pricePerMt: parseFloat(pricePerMt), currency: "USD" } });
      await qc.invalidateQueries({ queryKey: getListEwrsQueryKey() });
      await qc.invalidateQueries({ queryKey: getListSpotListingsQueryKey() });
      toast({ title: "Listed on Marketplace", description: "Your eWR is now listed anonymously on the spot market." });
      setListOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">e-WR Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your cooperative's electronic warehouse receipts — split, transfer, retire, or list on the market.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs">
          All spot listings and auction lots from this cooperative are automatically anonymised — buyers see only commodity type, grade, moisture %, tonnage, and warehouse zone prefix.
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : activeEwrs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active e-WRs. Request one from a finalised macro lot.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeEwrs.map(ewr => {
              const weight = parseFloat(String(ewr.weightMt));
              const canSplit = ewr.state === "INGESTED";
              const canRetire = ewr.state === "INGESTED" && !ewr.isLienActive;
              const canTransfer = ewr.state === "INGESTED" && !ewr.isLienActive;
              const canList = ewr.state === "INGESTED";
              return (
                <Card key={ewr.id}>
                  <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${STATE_COLORS[ewr.state] ?? ""}`}>{ewr.state}</Badge>
                        <span className="font-semibold">{ewr.commodityType} — {ewr.grade}</span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{ewr.ewrsReceiptId}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>{weight.toFixed(2)} MT</strong>
                        {ewr.warehouseCode && ` · ${ewr.warehouseCode}`}
                        {ewr.harvestSeason && ` · ${ewr.harvestSeason}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {canList && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openList(ewr.id)}>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          List
                        </Button>
                      )}
                      {canSplit && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openSplit(ewr.id, weight)}>
                          <Scissors className="w-3.5 h-3.5" />
                          Split
                        </Button>
                      )}
                      {canTransfer && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openTransfer(ewr.id)}>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Transfer
                        </Button>
                      )}
                      {canRetire && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => openRetire(ewr.id)}>
                          <Flame className="w-3.5 h-3.5" />
                          Retire
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Split eWR</DialogTitle>
            <DialogDescription>Total: {activeWeight.toFixed(2)} MT. Enter the weight for part A; part B is the remainder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Weight A (MT) *</Label>
            <Input type="number" min="0.001" max={activeWeight - 0.001} step="0.001" value={splitA} onChange={e => setSplitA(e.target.value)} placeholder="e.g. 10.000" />
            {splitA && !isNaN(parseFloat(splitA)) && (
              <p className="text-xs text-muted-foreground">Part B = {(activeWeight - parseFloat(splitA)).toFixed(3)} MT</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitOpen(false)}>Cancel</Button>
            <Button onClick={handleSplit} disabled={splitting} style={{ background: ACCENT }}>
              {splitting ? "Splitting…" : "Split eWR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer eWR</DialogTitle>
            <DialogDescription>Transfer ownership of this receipt to another registered user. The recipient must be a registered platform user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Recipient User ID *</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={toUserId}
              onChange={e => setToUserId(e.target.value)}
              placeholder="e.g. 3"
            />
            <p className="text-xs text-muted-foreground">Enter the numeric user ID of the recipient (visible in their profile).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={transferring} style={{ background: ACCENT }}>
              {transferring ? "Transferring…" : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={retireOpen} onOpenChange={setRetireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire eWR?</AlertDialogTitle>
            <AlertDialogDescription>
              This will extinguish the receipt and authorise physical withdrawal from the warehouse. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetire} className="bg-red-600 hover:bg-red-700">
              {retiring ? "Retiring…" : "Retire eWR"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>List on Marketplace</DialogTitle>
            <DialogDescription>Listing will be anonymised — no cooperative name or full warehouse code visible to buyers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Price per MT (USD) *</Label>
            <Input type="number" min="1" step="0.01" value={pricePerMt} onChange={e => setPricePerMt(e.target.value)} placeholder="e.g. 280.00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListOpen(false)}>Cancel</Button>
            <Button onClick={handleList} disabled={listing} style={{ background: ACCENT }}>
              {listing ? "Listing…" : "Create Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
