import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateTeaLot } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const createLotSchema = z.object({
  ewrId: z.coerce.number().min(1, "Select an eWR from your mandate holders"),
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(1, "Grade mark is required"),
  giOrigin: z.string().min(1, "GI origin is required"),
  grossWeightKg: z.coerce.number().min(0.001, "Gross weight must be > 0"),
  netWeightKg: z.coerce.number().min(0.001, "Net weight must be > 0"),
  tareWeightKg: z.coerce.number().min(0, "Tare weight must be >= 0"),
  packageType: z.string().min(1, "Package type is required"),
  listingType: z.enum(["AUCTION", "FIXED_PRICE"]),
  catalogueType: z.enum(["WITH_VALUATION", "WITHOUT_VALUATION"]),
  reservePriceUsd: z.coerce.number().min(0).optional(),
  fixedPricePerKgUsd: z.coerce.number().min(0).optional(),
  brokerValuationUsd: z.coerce.number().min(0).optional(),
  tasterRemarks: z.string().optional(),
});

type CreateLotForm = z.infer<typeof createLotSchema>;

interface AvailableEwr {
  id: number;
  ewrsReceiptId: string;
  warehouseCode: string;
  grade: string;
  weightMt: string;
  harvestSeason: string;
  state: string;
  ownerId: number;
  ownerName: string | null;
  teaProcessingType: string | null;
  teaLeafGrade: string | null;
  teaInvoiceSerial: string | null;
  estimatedValueUsd: string | null;
  issuedAt: string;
}

export default function NewTeaLot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch eWRs the broker is authorised to list (from mandate holders)
  const { data: availableEwrs = [], isLoading: ewrsLoading } = useQuery<AvailableEwr[]>({
    queryKey: ["/api/ewrs/broker-available"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/broker-available`, { signal });
      if (!res.ok) throw new Error("Failed to load available eWRs");
      return res.json();
    },
  });

  const form = useForm<CreateLotForm>({
    resolver: zodResolver(createLotSchema),
    defaultValues: {
      ewrId: 0,
      grade: "",
      gradeMark: "",
      giOrigin: "Kenya",
      grossWeightKg: 0,
      netWeightKg: 0,
      tareWeightKg: 0,
      packageType: "Paper Sack",
      listingType: "AUCTION",
      catalogueType: "WITH_VALUATION",
      reservePriceUsd: 0,
      fixedPricePerKgUsd: 0,
      brokerValuationUsd: 0,
      tasterRemarks: "",
    },
  });

  const selectedEwrId = form.watch("ewrId");
  const listingType = form.watch("listingType");

  const selectedEwr = availableEwrs.find((e) => e.id === Number(selectedEwrId));

  // Auto-fill from selected eWR — eWR is the source of truth for weight & grade
  useEffect(() => {
    if (!selectedEwr) return;
    const weightKg = parseFloat(selectedEwr.weightMt) * 1000;
    form.setValue("grade", selectedEwr.grade ?? "");
    form.setValue("grossWeightKg", weightKg);
    form.setValue("netWeightKg", weightKg);      // broker adjusts if tare is known
  }, [selectedEwr?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createLot = useCreateTeaLot({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: "Lot created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
        setLocation(`/broker/lots/${data.id}/edit`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create lot", description: err.message, variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: CreateLotForm) => {
    createLot.mutate({ data: data as any });
  };

  const noEwrs = !ewrsLoading && availableEwrs.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Create Tea Lot"
        description="Catalogue a lot from an eWR held by one of your mandate producers."
      />

      {/* Mandate / eWR status banner */}
      {noEwrs && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            No available eWRs found. This means either your mandate holders have no
            INGESTED tea receipts yet, or the factory portal hasn't pushed any eWRs.
            Ask the factory to push receipts via the integration API, or check that
            the producer has set their factory mark in their profile.
          </span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card p-8 border border-border shadow-sm">

            {/* ── eWR Selector ───────────────────────────────────────── */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2">
              Electronic Warehouse Receipt
            </div>

            <FormField control={form.control} name="ewrId" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Select eWR</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={ewrsLoading || availableEwrs.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-none h-11">
                      <SelectValue
                        placeholder={
                          ewrsLoading
                            ? "Loading available eWRs…"
                            : availableEwrs.length === 0
                            ? "No mandate eWRs available"
                            : "Select an eWR from your mandate holders…"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    {availableEwrs.map((ewr) => (
                      <SelectItem key={ewr.id} value={String(ewr.id)}>
                        <span className="font-mono text-xs mr-2">{ewr.ewrsReceiptId}</span>
                        <span className="text-muted-foreground">
                          {ewr.grade} · {parseFloat(ewr.weightMt).toFixed(3)} MT · {ewr.warehouseCode}
                          {ewr.ownerName ? ` · ${ewr.ownerName}` : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* eWR detail card — shown once an eWR is selected */}
            {selectedEwr && (
              <div className="col-span-1 md:col-span-2 bg-primary/5 border border-primary/20 p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Producer</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.ownerName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Weight</p>
                  <p className="font-semibold mt-0.5">{parseFloat(selectedEwr.weightMt).toFixed(3)} MT</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Processing</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.teaProcessingType ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leaf Grade</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.teaLeafGrade ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invoice Serial</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.teaInvoiceSerial ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Harvest Season</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.harvestSeason}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Warehouse</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.warehouseCode}</p>
                </div>
                {selectedEwr.estimatedValueUsd && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Est. Value</p>
                    <p className="font-semibold mt-0.5">USD {parseFloat(selectedEwr.estimatedValueUsd).toLocaleString()}</p>
                  </div>
                )}
                <div className="col-span-2 md:col-span-4 flex items-center gap-1.5 text-[11px] text-primary/70 pt-1 border-t border-primary/10">
                  <CheckCircle2 className="w-3 h-3" />
                  Grade and weight have been pre-filled from this eWR. Adjust if the physical lot differs.
                </div>
              </div>
            )}

            {/* ── Catalogue fields ────────────────────────────────────── */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Source & Identification
            </div>

            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade (e.g. BOP, BOPF, PF)</FormLabel>
                <FormControl>
                  <Input {...field} className="rounded-none h-11" placeholder="Pre-filled from eWR" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gradeMark" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Mark (Estate / Factory)</FormLabel>
                <FormControl>
                  <Input {...field} className="rounded-none h-11" placeholder="e.g. NKT, MKT" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="giOrigin" render={({ field }) => (
              <FormItem>
                <FormLabel>GI Origin</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="packageType" render={({ field }) => (
              <FormItem>
                <FormLabel>Package Type</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Weights & Packaging
            </div>

            <FormField control={form.control} name="grossWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Gross Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="netWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Net Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tareWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Tare Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* ── Listing details ─────────────────────────────────────── */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Listing Details
            </div>

            <FormField control={form.control} name="listingType" render={({ field }) => (
              <FormItem>
                <FormLabel>Listing Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-none h-11"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    <SelectItem value="AUCTION">Auction</SelectItem>
                    <SelectItem value="FIXED_PRICE">Fixed Price Spot</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="catalogueType" render={({ field }) => (
              <FormItem>
                <FormLabel>Catalogue Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-none h-11"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    <SelectItem value="WITH_VALUATION">With Valuation</SelectItem>
                    <SelectItem value="WITHOUT_VALUATION">Without Valuation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {listingType === "AUCTION" && (
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price (USD / kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {listingType === "FIXED_PRICE" && (
              <FormField control={form.control} name="fixedPricePerKgUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Price (USD / kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="brokerValuationUsd" render={({ field }) => (
              <FormItem>
                <FormLabel>Broker Valuation (USD / kg)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tasterRemarks" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Taster Remarks</FormLabel>
                <FormControl>
                  <Textarea {...field} className="rounded-none resize-y p-3" rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 border-t border-border pt-6 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/broker")}
                className="rounded-none px-6 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8 h-11 font-semibold"
                disabled={createLot.isPending || !selectedEwr}
              >
                {createLot.isPending ? "Creating…" : "Create Draft Lot"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
