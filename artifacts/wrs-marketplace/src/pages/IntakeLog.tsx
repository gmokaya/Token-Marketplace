import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListIntakeLogs, useCreateIntakeLog, useListCoopMembers, getListIntakeLogsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Wheat } from "lucide-react";

const ACCENT = "hsl(155 100% 18%)";
const COMMODITIES = ["MAIZE", "RICE", "COFFEE", "TEA", "AVOCADO"];

const COMMODITY_COLORS: Record<string, string> = {
  MAIZE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  RICE: "bg-teal-100 text-teal-800 border-teal-300",
  COFFEE: "bg-amber-100 text-amber-800 border-amber-300",
  TEA: "bg-green-100 text-green-800 border-green-300",
  AVOCADO: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export default function IntakeLogPage() {
  const { data: logs, isLoading } = useListIntakeLogs();
  const { data: members } = useListCoopMembers();
  const { mutateAsync: createLog, isPending } = useCreateIntakeLog();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    memberRef: "",
    commodityType: "",
    weightMt: "",
    moisturePct: "",
    grade: "",
  });

  async function handleSubmit() {
    if (!form.memberRef || !form.commodityType || !form.weightMt || !form.grade) {
      toast({ title: "Validation Error", description: "Member ref, commodity, weight and grade are required.", variant: "destructive" });
      return;
    }
    try {
      await createLog({ data: {
        memberRef: form.memberRef,
        commodityType: form.commodityType as any,
        weightMt: parseFloat(form.weightMt),
        moisturePct: form.moisturePct ? parseFloat(form.moisturePct) : undefined,
        grade: form.grade,
      } as any });
      await qc.invalidateQueries({ queryKey: getListIntakeLogsQueryKey() });
      toast({ title: "Intake Logged", description: `${form.weightMt} MT of ${form.commodityType} recorded.` });
      setOpen(false);
      setForm({ memberRef: "", commodityType: "", weightMt: "", moisturePct: "", grade: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  const totalWeight = (logs ?? []).reduce((s, l) => s + parseFloat(String(l.weightMt ?? 0)), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intake Log</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Record off-platform crop deliveries from cooperative members.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} style={{ background: ACCENT }} className="gap-2">
            <Plus className="w-4 h-4" />
            Log Delivery
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{(logs ?? []).length}</p>
              <p className="text-sm text-muted-foreground">Total Deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{totalWeight.toFixed(1)} MT</p>
              <p className="text-sm text-muted-foreground">Total Weight</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{new Set((logs ?? []).map(l => l.memberRef)).size}</p>
              <p className="text-sm text-muted-foreground">Unique Members</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wheat className="w-4 h-4" style={{ color: ACCENT }} />
              Delivery Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (logs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No deliveries logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="pb-2 pr-4">Member Ref</th>
                      <th className="pb-2 pr-4">Commodity</th>
                      <th className="pb-2 pr-4">Weight (MT)</th>
                      <th className="pb-2 pr-4">Moisture %</th>
                      <th className="pb-2 pr-4">Grade</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...(logs ?? [])].reverse().map(log => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-4">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{log.memberRef}</code>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`text-xs ${COMMODITY_COLORS[log.commodityType] ?? ""}`}>{log.commodityType}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-bold">{parseFloat(String(log.weightMt)).toFixed(2)}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{log.moisturePct ? `${parseFloat(String(log.moisturePct)).toFixed(1)}%` : "—"}</td>
                        <td className="py-2.5 pr-4">{log.grade}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">{new Date(log.intakeAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Crop Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Member Reference *</Label>
              <Select value={form.memberRef} onValueChange={v => setForm(p => ({ ...p, memberRef: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member…" /></SelectTrigger>
                <SelectContent>
                  {(members ?? []).map(m => (
                    <SelectItem key={m.memberRef} value={m.memberRef}>
                      <code className="text-xs">{m.memberRef}</code>
                      {m.farmLocation && <span className="text-muted-foreground ml-1 text-xs">— {m.farmLocation}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Commodity *</Label>
                <Select value={form.commodityType} onValueChange={v => setForm(p => ({ ...p, commodityType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Commodity…" /></SelectTrigger>
                  <SelectContent>
                    {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Grade *</Label>
                <Input value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} placeholder="e.g. Grade 1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Weight (MT) *</Label>
                <Input type="number" min="0.001" step="0.001" value={form.weightMt} onChange={e => setForm(p => ({ ...p, weightMt: e.target.value }))} placeholder="e.g. 2.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Moisture %</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.moisturePct} onChange={e => setForm(p => ({ ...p, moisturePct: e.target.value }))} placeholder="e.g. 13.5" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} style={{ background: ACCENT }}>
              {isPending ? "Logging…" : "Log Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
