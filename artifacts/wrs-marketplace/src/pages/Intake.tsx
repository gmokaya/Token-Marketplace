import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetMe, customFetch } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Loader2, Wheat, Coffee, Leaf, Apple, PackageCheck,
  ShoppingBag, Gavel, FileText, Shield, Building2, ClipboardCheck
} from "lucide-react";

type CommodityType = "MAIZE" | "RICE" | "COFFEE" | "TEA" | "AVOCADO";

interface Producer { id: number; clerkId: string; name: string; company: string | null }

interface RegistryConfirmation {
  receiptId: string;
  signature: string;
  issuedAt: string;
  registrar: string;
  registrarCode: string;
  status: "VERIFIED";
  ownerName: string;
  ownerCompany: string | null;
}

interface PipelineStep {
  step: number;
  label: string;
  description: string;
  completedAt: string;
}

interface IntakeResult {
  registryConfirmation: RegistryConfirmation;
  ewr: { id: number; ewrsReceiptId: string; commodityType: string };
  pipelineSteps: PipelineStep[];
}

const COMMODITY_META: Record<CommodityType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; batchType: string }> = {
  MAIZE:   { label: "Maize",   icon: Wheat,   color: "bg-slate-100 border-slate-300 text-slate-700", batchType: "FUNGIBLE" },
  RICE:    { label: "Rice",    icon: Wheat,   color: "bg-blue-100 border-blue-300 text-blue-800",       batchType: "FUNGIBLE" },
  COFFEE:  { label: "Coffee",  icon: Coffee,  color: "bg-slate-100 border-slate-300 text-slate-700",    batchType: "SEMI_FUNGIBLE" },
  TEA:     { label: "Tea",     icon: Leaf,    color: "bg-green-100 border-green-300 text-green-800",    batchType: "NON_FUNGIBLE" },
  AVOCADO: { label: "Avocado", icon: Apple,   color: "bg-emerald-100 border-emerald-300 text-emerald-800", batchType: "TIME_DECAYING" },
};

const PIPELINE_ICONS = [Building2, ClipboardCheck, Shield, PackageCheck, ShoppingBag];

function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Physical Intake", "Grading Variables", "Registry Submission", "Confirmation"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < current ? "bg-primary border-primary text-primary-foreground" :
              i === current ? "bg-primary/10 border-primary text-primary" :
              "bg-muted border-muted-foreground/30 text-muted-foreground"
            }`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs whitespace-nowrap hidden sm:block ${i === current ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${i < current ? "bg-primary" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Physical Intake ─────────────────────────────────────────────────
function Step1({
  form, setForm, onNext, tier, producers, producersLoading,
}: {
  form: any; setForm: (f: any) => void; onNext: () => void;
  tier: string | undefined; producers: Producer[]; producersLoading: boolean;
}) {
  const canProceed = form.commodityType && form.warehouseCode && form.grade &&
    form.weightMt && form.harvestSeason &&
    (tier !== "ENABLER" || form.producerClerkId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Physical Intake &amp; Inspection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The producer delivers the physical lot to a WRSC-certified warehouse. Select commodity and enter logistical parameters.
        </p>
      </div>

      {/* Commodity selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Commodity Type <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.entries(COMMODITY_META) as [CommodityType, typeof COMMODITY_META[CommodityType]][]).map(([ct, meta]) => {
            const Icon = meta.icon;
            const active = form.commodityType === ct;
            return (
              <button
                key={ct}
                type="button"
                onClick={() => setForm({ ...form, commodityType: ct })}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  active ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ENABLER: producer selection */}
      {tier === "ENABLER" && (
        <div className="space-y-2">
          <Label>Producer <span className="text-destructive">*</span></Label>
          <Select value={form.producerClerkId} onValueChange={v => setForm({ ...form, producerClerkId: v })}>
            <SelectTrigger>
              <SelectValue placeholder={producersLoading ? "Loading producers…" : "Select a registered producer"} />
            </SelectTrigger>
            <SelectContent>
              {producers.map(p => (
                <SelectItem key={p.clerkId} value={p.clerkId}>
                  {p.name}{p.company ? ` - ${p.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The e-WR will be registered to this producer's asset ledger.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Warehouse Code <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. WH-NBI-001" value={form.warehouseCode}
            onChange={e => setForm({ ...form, warehouseCode: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Grade <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. Grade A" value={form.grade}
            onChange={e => setForm({ ...form, grade: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Weight (MT) <span className="text-destructive">*</span></Label>
          <Input type="number" min="0" step="0.001" placeholder="e.g. 25.500" value={form.weightMt}
            onChange={e => setForm({ ...form, weightMt: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Harvest Season <span className="text-destructive">*</span></Label>
          <Input placeholder="e.g. 2024A" value={form.harvestSeason}
            onChange={e => setForm({ ...form, harvestSeason: e.target.value })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Estimated Value (USD) <span className="text-muted-foreground text-xs">optional</span></Label>
          <Input type="number" min="0" step="1" placeholder="e.g. 15000" value={form.estimatedValueUsd}
            onChange={e => setForm({ ...form, estimatedValueUsd: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Grading Variables <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Grading Variables ───────────────────────────────────────────────
function Step2({ form, setForm, onNext, onBack }: { form: any; setForm: (f: any) => void; onNext: () => void; onBack: () => void }) {
  const ct: CommodityType = form.commodityType;

  const canProceed = (() => {
    if (ct === "MAIZE" || ct === "RICE") {
      return form.moisturePct && form.foreignMatterPct !== "" && form.brokenGrainsPct !== "" && form.insectDamagedGrainsPct !== "";
    }
    if (ct === "COFFEE") return form.coffeeBeanSize && form.coffeeCuppingScore;
    if (ct === "TEA") return form.teaProcessingType && form.teaLeafGrade && form.teaInvoiceSerial;
    if (ct === "AVOCADO") return form.avocadoVariety && form.avocadoSizingCode;
    return false;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Grading Variables</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Warehouse operator inputs quality parameters into the WMS. These will be validated against EAS standards before registry submission.
        </p>
      </div>

      {(ct === "MAIZE" || ct === "RICE") && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {ct === "MAIZE" ? "EAS 2:2013" : "EAS 128:2013"}
            </Badge>
            <span className="text-xs text-muted-foreground">Limits: moisture ≤{ct === "MAIZE" ? "13.5" : "14.0"}%, FM ≤1.0%, broken ≤2.0%, insect ≤1.0%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moisture % <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.1" placeholder={ct === "MAIZE" ? "≤ 13.5" : "≤ 14.0"}
                value={form.moisturePct} onChange={e => setForm({ ...form, moisturePct: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Foreign Matter % <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="≤ 1.0"
                value={form.foreignMatterPct} onChange={e => setForm({ ...form, foreignMatterPct: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Broken Grains % <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="≤ 2.0"
                value={form.brokenGrainsPct} onChange={e => setForm({ ...form, brokenGrainsPct: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Insect Damaged % <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="0.01" placeholder="≤ 1.0"
                value={form.insectDamagedGrainsPct} onChange={e => setForm({ ...form, insectDamagedGrainsPct: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {ct === "COFFEE" && (
        <div className="space-y-4">
          <Badge variant="outline" className="text-xs">Semi-Fungible · Micro-lot isolation</Badge>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bean Size <span className="text-destructive">*</span></Label>
              <Select value={form.coffeeBeanSize} onValueChange={v => setForm({ ...form, coffeeBeanSize: v })}>
                <SelectTrigger><SelectValue placeholder="Select bean size" /></SelectTrigger>
                <SelectContent>
                  {["AA", "AB", "PB", "C"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cupping Score (1–10) <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" max="10" step="0.1" placeholder="e.g. 8.5"
                value={form.coffeeCuppingScore} onChange={e => setForm({ ...form, coffeeCuppingScore: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Moisture % <span className="text-muted-foreground text-xs">optional</span></Label>
              <Input type="number" min="0" step="0.1" placeholder="e.g. 11.5"
                value={form.moisturePct} onChange={e => setForm({ ...form, moisturePct: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {ct === "TEA" && (
        <div className="space-y-4">
          <Badge variant="outline" className="text-xs">Non-Fungible · Unique invoice serial</Badge>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Processing Type <span className="text-destructive">*</span></Label>
              <Select value={form.teaProcessingType} onValueChange={v => setForm({ ...form, teaProcessingType: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CTC">CTC</SelectItem>
                  <SelectItem value="ORTHODOX">Orthodox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leaf Grade <span className="text-destructive">*</span></Label>
              <Select value={form.teaLeafGrade} onValueChange={v => setForm({ ...form, teaLeafGrade: v })}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {["BOP", "BOPF", "D1", "PF"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Invoice Serial <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. TEA-INV-2024-00142" value={form.teaInvoiceSerial}
                onChange={e => setForm({ ...form, teaInvoiceSerial: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {ct === "AVOCADO" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Time-Decaying · EAS 19:2017</Badge>
            <span className="text-xs text-muted-foreground">30-day shelf life. Cold-chain compliance mandatory.</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Variety <span className="text-destructive">*</span></Label>
              <Select value={form.avocadoVariety} onValueChange={v => setForm({ ...form, avocadoVariety: v })}>
                <SelectTrigger><SelectValue placeholder="Select variety" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HASS">Hass</SelectItem>
                  <SelectItem value="FUERTE">Fuerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sizing Code (10–30) <span className="text-destructive">*</span></Label>
              <Input type="number" min="10" max="30" step="1" placeholder="e.g. 18"
                value={form.avocadoSizingCode} onChange={e => setForm({ ...form, avocadoSizingCode: e.target.value })} />
            </div>
            <div className="col-span-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <Checkbox
                  id="coldchain"
                  checked={form.avocadoColdChainCompliant === true}
                  onCheckedChange={v => setForm({ ...form, avocadoColdChainCompliant: v === true })}
                />
                <div>
                  <label htmlFor="coldchain" className="text-sm font-medium cursor-pointer">Cold-Chain Compliance Certified</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    I confirm that this lot has been maintained under continuous cold-chain conditions as required by EAS 19:2017.
                    Intake will be rejected if uncertified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Review &amp; Submit <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Registry Submission ──────────────────────────────────────────────
function Step3({ form, onBack, onSuccess }: {
  form: any; onBack: () => void; onSuccess: (result: IntakeResult) => void;
}) {
  const ct: CommodityType = form.commodityType;
  const meta = COMMODITY_META[ct];

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        commodityType: form.commodityType,
        warehouseCode: form.warehouseCode,
        grade: form.grade,
        weightMt: parseFloat(form.weightMt),
        harvestSeason: form.harvestSeason,
      };
      if (form.estimatedValueUsd) payload.estimatedValueUsd = parseFloat(form.estimatedValueUsd);
      if (form.producerClerkId)   payload.producerClerkId = form.producerClerkId;
      if (form.moisturePct)       payload.moisturePct = parseFloat(form.moisturePct);
      if (form.foreignMatterPct !== undefined && form.foreignMatterPct !== "") payload.foreignMatterPct = parseFloat(form.foreignMatterPct);
      if (form.brokenGrainsPct !== undefined && form.brokenGrainsPct !== "")  payload.brokenGrainsPct = parseFloat(form.brokenGrainsPct);
      if (form.insectDamagedGrainsPct !== undefined && form.insectDamagedGrainsPct !== "") payload.insectDamagedGrainsPct = parseFloat(form.insectDamagedGrainsPct);
      if (form.coffeeBeanSize)      payload.coffeeBeanSize = form.coffeeBeanSize;
      if (form.coffeeCuppingScore)  payload.coffeeCuppingScore = parseFloat(form.coffeeCuppingScore);
      if (form.teaProcessingType)   payload.teaProcessingType = form.teaProcessingType;
      if (form.teaLeafGrade)        payload.teaLeafGrade = form.teaLeafGrade;
      if (form.teaInvoiceSerial)    payload.teaInvoiceSerial = form.teaInvoiceSerial;
      if (form.avocadoVariety)      payload.avocadoVariety = form.avocadoVariety;
      if (form.avocadoSizingCode)   payload.avocadoSizingCode = parseInt(form.avocadoSizingCode);
      if (form.avocadoColdChainCompliant !== undefined) payload.avocadoColdChainCompliant = form.avocadoColdChainCompliant;

      return customFetch<IntakeResult>("/api/wrsc/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">WRSC Registry Submission</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the intake summary and transmit to the WRSC Central Registry. A signed JSON payload will be dispatched to the eWRS-CR API.
        </p>
      </div>

      {/* Summary card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
              <meta.icon className="w-3.5 h-3.5" />
              {meta.label}
            </span>
            <Badge variant="secondary" className="text-xs">{meta.batchType.replace("_", " ")}</Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-muted-foreground">Warehouse</div><div className="font-medium">{form.warehouseCode}</div>
            <div className="text-muted-foreground">Grade</div><div className="font-medium">{form.grade}</div>
            <div className="text-muted-foreground">Weight</div><div className="font-medium">{form.weightMt} MT</div>
            <div className="text-muted-foreground">Harvest</div><div className="font-medium">{form.harvestSeason}</div>
            {form.estimatedValueUsd && <>
              <div className="text-muted-foreground">Est. Value</div><div className="font-medium">USD {parseFloat(form.estimatedValueUsd).toLocaleString()}</div>
            </>}
            {(ct === "MAIZE" || ct === "RICE") && <>
              <div className="text-muted-foreground">Moisture</div><div className="font-medium">{form.moisturePct}%</div>
              <div className="text-muted-foreground">Foreign Matter</div><div className="font-medium">{form.foreignMatterPct}%</div>
            </>}
            {ct === "COFFEE" && <>
              <div className="text-muted-foreground">Bean Size</div><div className="font-medium">{form.coffeeBeanSize}</div>
              <div className="text-muted-foreground">Cupping Score</div><div className="font-medium">{form.coffeeCuppingScore}/10</div>
            </>}
            {ct === "TEA" && <>
              <div className="text-muted-foreground">Processing</div><div className="font-medium">{form.teaProcessingType}</div>
              <div className="text-muted-foreground">Leaf Grade</div><div className="font-medium">{form.teaLeafGrade}</div>
            </>}
            {ct === "AVOCADO" && <>
              <div className="text-muted-foreground">Variety</div><div className="font-medium">{form.avocadoVariety}</div>
              <div className="text-muted-foreground">Sizing Code</div><div className="font-medium">{form.avocadoSizingCode}</div>
              <div className="text-muted-foreground">Cold-Chain</div>
              <div className={`font-medium ${form.avocadoColdChainCompliant ? "text-green-600" : "text-red-600"}`}>
                {form.avocadoColdChainCompliant ? "Compliant" : "NOT COMPLIANT"}
              </div>
            </>}
          </div>
        </CardContent>
      </Card>

      {mutation.isError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {(mutation.error as any)?.violations
            ? (mutation.error as any).violations.join(" · ")
            : (mutation.error as any)?.error ?? "Submission failed. Please check your values."}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={mutation.isPending}>
          <ArrowLeft className="mr-2 w-4 h-4" /> Back
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="min-w-40">
          {mutation.isPending ? (
            <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Transmitting…</>
          ) : (
            <><Shield className="mr-2 w-4 h-4" /> Submit to WRSC Registry</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Confirmation ─────────────────────────────────────────────────────
function Step4({ result }: { result: IntakeResult }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [, navigate] = useLocation();
  const { registryConfirmation, ewr, pipelineSteps } = result;

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setVisibleSteps(i);
      if (i < pipelineSteps.length) setTimeout(tick, 480);
    };
    setTimeout(tick, 200);
  }, [pipelineSteps.length]);

  const allVisible = visibleSteps >= pipelineSteps.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        {allVisible ? (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">e-WR Successfully Registered</h2>
            <p className="text-sm text-muted-foreground">
              Receipt <span className="font-mono font-semibold text-foreground">{registryConfirmation.receiptId}</span> has been minted and synchronized to {registryConfirmation.ownerName}'s asset ledger.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <h2 className="text-xl font-semibold">Processing Pipeline…</h2>
          </>
        )}
      </div>

      {/* Pipeline steps */}
      <div className="space-y-2">
        {pipelineSteps.map((s, i) => {
          const Icon = PIPELINE_ICONS[i];
          const visible = i < visibleSteps;
          return (
            <div key={s.step}
              className={`flex gap-3 p-3 rounded-lg border transition-all duration-500 ${
                visible ? "border-green-200 bg-green-50 opacity-100" : "border-border bg-muted/20 opacity-30"
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                visible ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
              }`}>
                {visible ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground">Step {s.step}</span>
                  <span className="text-sm font-medium">{s.label}</span>
                  {visible && (
                    <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                      {new Date(s.completedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registry certificate */}
      {allVisible && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <CardTitle className="text-sm text-green-800">WRSC Registry Certificate</CardTitle>
              <Badge className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">VERIFIED</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="text-muted-foreground">Receipt ID</div>
            <div className="font-mono font-semibold">{registryConfirmation.receiptId}</div>
            <div className="text-muted-foreground">Registrar</div>
            <div>{registryConfirmation.registrar} ({registryConfirmation.registrarCode})</div>
            <div className="text-muted-foreground">Signature</div>
            <div className="font-mono truncate">{registryConfirmation.signature}</div>
            <div className="text-muted-foreground">Issued At</div>
            <div>{new Date(registryConfirmation.issuedAt).toLocaleString()}</div>
            <div className="text-muted-foreground">Asset Holder</div>
            <div>{registryConfirmation.ownerName}{registryConfirmation.ownerCompany ? ` · ${registryConfirmation.ownerCompany}` : ""}</div>
          </CardContent>
        </Card>
      )}

      {/* Market routing */}
      {allVisible && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-center text-muted-foreground">Dispatch asset to a market engine:</p>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="flex-col h-16 gap-1 text-xs" onClick={() => navigate("/marketplace")}>
              <ShoppingBag className="w-5 h-5" />
              Spot Marketplace
            </Button>
            <Button variant="outline" className="flex-col h-16 gap-1 text-xs" onClick={() => navigate("/auctions")}>
              <Gavel className="w-5 h-5" />
              Live Auction
            </Button>
            <Button variant="outline" className="flex-col h-16 gap-1 text-xs" onClick={() => navigate("/forwards")}>
              <FileText className="w-5 h-5" />
              Forward Contract
            </Button>
          </div>
          <Button variant="ghost" className="w-full text-sm" onClick={() => navigate("/portfolio")}>
            View Portfolio →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Intake() {
  const { data: me } = useGetMe();
  const tier = me?.tier;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, any>>({
    commodityType: "", warehouseCode: "", grade: "", weightMt: "", harvestSeason: "",
    estimatedValueUsd: "", producerClerkId: "",
    moisturePct: "", foreignMatterPct: "", brokenGrainsPct: "", insectDamagedGrainsPct: "",
    coffeeBeanSize: "", coffeeCuppingScore: "", teaProcessingType: "", teaLeafGrade: "",
    teaInvoiceSerial: "", avocadoVariety: "", avocadoSizingCode: "", avocadoColdChainCompliant: false,
  });
  const [result, setResult] = useState<IntakeResult | null>(null);

  const { data: producers = [], isLoading: producersLoading } = useQuery<Producer[]>({
    queryKey: ["wrsc-producers"],
    queryFn: () => customFetch<Producer[]>("/api/wrsc/producers"),
    enabled: tier === "ENABLER",
  });

  const handleSuccess = useCallback((res: IntakeResult) => {
    setResult(res);
    setStep(3);
  }, []);

  if (tier && tier !== "PRODUCER" && tier !== "ENABLER") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          WMS Intake is only available to Producers and Warehouse Operators.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 py-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WMS Intake</h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end pipeline from physical warehouse delivery to digital asset registration on the WRSC Central Registry.
          </p>
        </div>

        <StepIndicator current={step} total={4} />

        <Card>
          <CardContent className="pt-6">
            {step === 0 && (
              <Step1
                form={form} setForm={setForm} onNext={() => setStep(1)}
                tier={tier} producers={producers} producersLoading={producersLoading}
              />
            )}
            {step === 1 && (
              <Step2 form={form} setForm={setForm} onNext={() => setStep(2)} onBack={() => setStep(0)} />
            )}
            {step === 2 && (
              <Step3 form={form} onBack={() => setStep(1)} onSuccess={handleSuccess} />
            )}
            {step === 3 && result && (
              <Step4 result={result} />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
