import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  useListMacroLots, useCreateMacroLot, useFinaliseMacroLot, useRequestEwrForLot,
  getListMacroLotsQueryKey, useListEwrs, useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Layers, CheckCircle2, FileText } from "lucide-react";

const ACCENT = "hsl(180 62% 10%)";
const COMMODITIES = ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  FINALISED: "bg-blue-100 text-blue-800",
  EWR_REQUESTED: "bg-yellow-100 text-yellow-800",
  EWR_ISSUED: "bg-emerald-100 text-emerald-800",
};

export default function MacroLotsPage() {
  const { data: lots, isLoading } = useListMacroLots();
  const { mutateAsync: createLot, isPending: creating } = useCreateMacroLot();
  const { mutateAsync: finaliseLot, isPending: finalising } = useFinaliseMacroLot();
  const { mutateAsync: requestEwr, isPending: requesting } = useRequestEwrForLot();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [ewrOpen, setEwrOpen] = useState(false);
  const [activeLotId, setActiveLotId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ commodityType: "", grade: "", warehouseCode: "", harvestSeason: "" });
  const [ewrForm, setEwrForm] = useState({ warehouseCode: "", harvestSeason: "" });

  async function handleCreate() {
    if (!createForm.commodityType || !createForm.grade) {
      toast({ title: "Validation Error", description: "Commodity and grade required.", variant: "destructive" });
      return;
    }
    try {
      await createLot({ data: createForm as any });
      await qc.invalidateQueries({ queryKey: getListMacroLotsQueryKey() });
      toast({ title: "Macro Lot Created", description: "New lot is OPEN for intake." });
      setCreateOpen(false);
      setCreateForm({ commodityType: "", grade: "", warehouseCode: "", harvestSeason: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  async function handleFinalise(lotId: number) {
    try {
      await finaliseLot({ lotId });
      await qc.invalidateQueries({ queryKey: getListMacroLotsQueryKey() });
      toast({ title: "Lot Finalised", description: "No more intake can be added. Ready for eWR request." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  async function handleRequestEwr() {
    if (!ewrForm.warehouseCode || !ewrForm.harvestSeason) {
      toast({ title: "Validation Error", description: "Warehouse code and harvest season required.", variant: "destructive" });
      return;
    }
    try {
      await requestEwr({ lotId: activeLotId!, data: ewrForm });
      await qc.invalidateQueries({ queryKey: getListMacroLotsQueryKey() });
      toast({ title: "eWR Issued", description: "The e-WR has been created and is now in your inventory." });
      setEwrOpen(false);
      setEwrForm({ warehouseCode: "", harvestSeason: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Macro Lots</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Aggregate intake deliveries into tradeable lots, then request eWR issuance.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} style={{ background: ACCENT }} className="gap-2">
            <Plus className="w-4 h-4" />
            New Lot
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (lots ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No macro lots yet. Create one to start aggregating intake.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(lots ?? []).map(lot => (
              <Card key={lot.id}>
                <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${STATUS_COLORS[lot.status] ?? ""}`}>{lot.status}</Badge>
                      <span className="font-semibold">{lot.commodityType} - {lot.grade}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong>{parseFloat(String(lot.totalWeightMt)).toFixed(2)} MT</strong>
                      {lot.warehouseCode && ` · ${lot.warehouseCode}`}
                      {lot.harvestSeason && ` · ${lot.harvestSeason}`}
                    </p>
                    {lot.ewrId && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> eWR #{lot.ewrId} issued
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {lot.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={finalising}
                        onClick={() => handleFinalise(lot.id)}
                      >
                        Finalise
                      </Button>
                    )}
                    {lot.status === "FINALISED" && (
                      <Button
                        size="sm"
                        style={{ background: ACCENT }}
                        className="gap-1"
                        onClick={() => { setActiveLotId(lot.id); setEwrOpen(true); }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Request eWR
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Macro Lot</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Commodity *</Label>
              <Select value={createForm.commodityType} onValueChange={v => setCreateForm(p => ({ ...p, commodityType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select commodity…" /></SelectTrigger>
                <SelectContent>
                  {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grade *</Label>
              <Input value={createForm.grade} onChange={e => setCreateForm(p => ({ ...p, grade: e.target.value }))} placeholder="e.g. Grade 1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} style={{ background: ACCENT }}>
              {creating ? "Creating…" : "Create Lot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ewrOpen} onOpenChange={setEwrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request eWR Issuance</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The WRSC will issue an e-WR in your cooperative's name for this macro lot.</p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Warehouse Code *</Label>
              <Input value={ewrForm.warehouseCode} onChange={e => setEwrForm(p => ({ ...p, warehouseCode: e.target.value }))} placeholder="e.g. NKR-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Harvest Season *</Label>
              <Input value={ewrForm.harvestSeason} onChange={e => setEwrForm(p => ({ ...p, harvestSeason: e.target.value }))} placeholder="e.g. 2025A" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEwrOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestEwr} disabled={requesting} style={{ background: ACCENT }}>
              {requesting ? "Issuing…" : "Issue eWR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
