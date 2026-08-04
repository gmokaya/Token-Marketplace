import { useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Leaf, PlusCircle, Zap, Droplets, Wind, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EMPTY = {
  reportingPeriod: "", energyKwhTotal: "", waterM3Total: "", co2KgTotal: "",
  wasteKgTotal: "", wasteRecycledPct: "", renewableEnergyPct: "",
  totalWorkers: "", femaleWorkersPct: "", averageWageUsd: "", safetyIncidents: "",
  trainingHrsPerWorker: "", childLaborPolicy: "", communityInvestmentUsd: "",
  auditorName: "", auditDate: "", auditReportUrl: "", notes: "",
};

export default function ProducerEsg() {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tea/esg"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/tea/esg`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to load ESG reports");
      return res.json();
    },
    enabled: !!me,
  });

  const upsert = useMutation({
    mutationFn: async (data: any) => {
      const url    = editId ? `${BASE}/api/tea/esg/${editId}` : `${BASE}/api/tea/esg`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tea/esg"] });
      setOpen(false);
      setEditId(null);
      setForm(EMPTY);
      toast({ title: editId ? "Report updated" : "ESG report submitted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() { setEditId(null); setForm(EMPTY); setOpen(true); }

  function openEdit(r: any) {
    setEditId(r.id);
    setForm({
      reportingPeriod: r.reportingPeriod ?? "",
      energyKwhTotal: r.energyKwhTotal ?? "", waterM3Total: r.waterM3Total ?? "",
      co2KgTotal: r.co2KgTotal ?? "", wasteKgTotal: r.wasteKgTotal ?? "",
      wasteRecycledPct: r.wasteRecycledPct ?? "", renewableEnergyPct: r.renewableEnergyPct ?? "",
      totalWorkers: r.totalWorkers?.toString() ?? "", femaleWorkersPct: r.femaleWorkersPct ?? "",
      averageWageUsd: r.averageWageUsd ?? "", safetyIncidents: r.safetyIncidents?.toString() ?? "",
      trainingHrsPerWorker: r.trainingHrsPerWorker ?? "", childLaborPolicy: r.childLaborPolicy ?? "",
      communityInvestmentUsd: r.communityInvestmentUsd ?? "",
      auditorName: r.auditorName ?? "", auditDate: r.auditDate ? r.auditDate.split("T")[0] : "",
      auditReportUrl: r.auditReportUrl ?? "", notes: r.notes ?? "",
    });
    setOpen(true);
  }

  function handleSubmit() {
    const toNum = (v: string) => v ? parseFloat(v) : undefined;
    const toInt = (v: string) => v ? parseInt(v, 10) : undefined;
    upsert.mutate({
      reportingPeriod: form.reportingPeriod,
      energyKwhTotal: toNum(form.energyKwhTotal), waterM3Total: toNum(form.waterM3Total),
      co2KgTotal: toNum(form.co2KgTotal), wasteKgTotal: toNum(form.wasteKgTotal),
      wasteRecycledPct: toNum(form.wasteRecycledPct), renewableEnergyPct: toNum(form.renewableEnergyPct),
      totalWorkers: toInt(form.totalWorkers), femaleWorkersPct: toNum(form.femaleWorkersPct),
      averageWageUsd: toNum(form.averageWageUsd), safetyIncidents: toInt(form.safetyIncidents),
      trainingHrsPerWorker: toNum(form.trainingHrsPerWorker),
      childLaborPolicy: form.childLaborPolicy || undefined,
      communityInvestmentUsd: toNum(form.communityInvestmentUsd),
      auditorName: form.auditorName || undefined,
      auditDate: form.auditDate || undefined,
      auditReportUrl: form.auditReportUrl || undefined,
      notes: form.notes || undefined,
      certifications: [],
    });
  }

  const f = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="ESG Reports"
        description="Environmental, Social & Governance data shared with buyers and certification bodies."
        actions={
          <Button onClick={openCreate} className="rounded-none h-10 px-5 gap-2">
            <PlusCircle className="w-4 h-4" /> New Report
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center">
          <Leaf className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No ESG reports yet. Add your first report to share sustainability data with buyers.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((r: any) => (
            <div key={r.id} className="border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{r.reportingPeriod}</p>
                <Button size="sm" variant="ghost" className="rounded-none h-7 px-2 text-xs" onClick={() => openEdit(r)}>Edit</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {r.co2KgTotal && (
                  <div className="flex items-center gap-2">
                    <Wind className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{parseFloat(r.co2KgTotal).toLocaleString()} kg CO₂</p>
                      <p className="text-[10px] text-muted-foreground">Total emissions</p>
                    </div>
                  </div>
                )}
                {r.waterM3Total && (
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{parseFloat(r.waterM3Total).toLocaleString()} m³</p>
                      <p className="text-[10px] text-muted-foreground">Water used</p>
                    </div>
                  </div>
                )}
                {r.renewableEnergyPct && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{parseFloat(r.renewableEnergyPct).toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Renewable energy</p>
                    </div>
                  </div>
                )}
                {r.femaleWorkersPct && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{parseFloat(r.femaleWorkersPct).toFixed(1)}% female</p>
                      <p className="text-[10px] text-muted-foreground">{r.totalWorkers ? `of ${r.totalWorkers} workers` : "workforce"}</p>
                    </div>
                  </div>
                )}
              </div>

              {r.auditorName && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                  Audited by {r.auditorName}{r.auditDate ? ` on ${new Date(r.auditDate).toLocaleDateString()}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader><DialogTitle>{editId ? "Edit ESG Report" : "New ESG Report"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">Reporting Period * (e.g. 2025, 2025-Q1)</Label>
              <Input value={form.reportingPeriod} onChange={f("reportingPeriod")} className="h-8 text-sm rounded-none" />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Environmental</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["energyKwhTotal",     "Total Energy (kWh)"],
                ["waterM3Total",       "Water Used (m³)"],
                ["co2KgTotal",         "CO₂ Emitted (kg)"],
                ["wasteKgTotal",       "Waste Generated (kg)"],
                ["wasteRecycledPct",   "Waste Recycled (%)"],
                ["renewableEnergyPct", "Renewable Energy (%)"],
              ] as [keyof typeof EMPTY, string][]).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs mb-1 block">{label}</Label>
                  <Input type="number" value={form[k]} onChange={f(k)} className="h-8 text-sm rounded-none" />
                </div>
              ))}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Social</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["totalWorkers",          "Total Workers"],
                ["femaleWorkersPct",      "Female Workers (%)"],
                ["averageWageUsd",        "Avg Wage (USD)"],
                ["safetyIncidents",       "Safety Incidents"],
                ["trainingHrsPerWorker",  "Training Hrs/Worker"],
                ["communityInvestmentUsd","Community Investment ($)"],
              ] as [keyof typeof EMPTY, string][]).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs mb-1 block">{label}</Label>
                  <Input type="number" value={form[k]} onChange={f(k)} className="h-8 text-sm rounded-none" />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Child Labour Policy</Label>
              <Input value={form.childLaborPolicy} onChange={f("childLaborPolicy")} placeholder="e.g. Zero Tolerance" className="h-8 text-sm rounded-none" />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Governance</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["auditorName",    "Auditor Name"],
                ["auditDate",      "Audit Date"],
                ["auditReportUrl", "Audit Report URL"],
              ] as [keyof typeof EMPTY, string][]).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs mb-1 block">{label}</Label>
                  <Input type={k === "auditDate" ? "date" : "text"} value={form[k]} onChange={f(k)} className="h-8 text-sm rounded-none" />
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={f("notes")} rows={2} className="text-sm rounded-none resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="rounded-none" disabled={upsert.isPending || !form.reportingPeriod} onClick={handleSubmit}>
              {upsert.isPending ? "Saving…" : editId ? "Save Changes" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
