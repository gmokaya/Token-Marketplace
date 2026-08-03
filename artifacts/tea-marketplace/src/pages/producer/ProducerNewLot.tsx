import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { useCreateTeaLot, useGetWarehouseProfileByCode, getGetWarehouseProfileByCodeQueryKey } from "@workspace/api-client-react";
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
  ewrId: z.coerce.number().min(1, "Select an eWR"),
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(1, "Grade mark is required"),
  giOrigin: z.string().min(1, "GI origin is required"),
  grossWeightKg: z.coerce.number().min(0.001, "Gross weight must be > 0"),
  netWeightKg: z.coerce.number().min(0.001, "Net weight must be > 0"),
  tareWeightKg: z.coerce.number().min(0, "Tare weight must be ≥ 0"),
  packageType: z.string().min(1, "Package type is required"),
  listingType: z.enum(["AUCTION", "FIXED_PRICE"]),
  reservePriceUsd: z.coerce.number().min(0).optional(),
  fixedPricePerKgUsd: z.coerce.number().min(0).optional(),
  tasterRemarks: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.listingType === "AUCTION" && !v.reservePriceUsd) {
    ctx.addIssue({ code: "custom", path: ["reservePriceUsd"], message: "Reserve price is required for auctions" });
  }
  if (v.listingType === "FIXED_PRICE" && !v.fixedPricePerKgUsd) {
    ctx.addIssue({ code: "custom", path: ["fixedPricePerKgUsd"], message: "Fixed price is required for direct sales" });
  }
});

type CreateLotForm = z.infer<typeof createLotSchema>;

export default function ProducerNewLot() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const preselectedEwrId = new URLSearchParams(search).get("ewrId");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch producer's own INGESTED TEA eWRs
  const { data: portfolio } = useQuery({
    queryKey: ["/api/ewrs/my-portfolio"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/my-portfolio`, { signal });
      if (!res.ok) throw new Error("Failed to load eWRs");
      return res.json() as Promise<{ ewrs: any[] }>;
    },
  });

  const teaEwrs = (portfolio?.ewrs ?? []).filter(
    (e: any) => e.commodityType === "TEA" && e.state === "INGESTED",
  );

  const form = useForm<CreateLotForm>({
    resolver: zodResolver(createLotSchema),
    defaultValues: {
      ewrId: preselectedEwrId ? Number(preselectedEwrId) : 0,
      grade: "",
      gradeMark: "",
      giOrigin: "Kenya",
      grossWeightKg: 0,
      netWeightKg: 0,
      tareWeightKg: 0,
      packageType: "Paper Sack",
      listingType: "FIXED_PRICE",
      reservePriceUsd: 0,
      fixedPricePerKgUsd: 0,
      tasterRemarks: "",
    },
  });

  const selectedEwrId = form.watch("ewrId");
  const listingType = form.watch("listingType");
  const selectedEwr = teaEwrs.find((e: any) => e.id === Number(selectedEwrId));
  const selectedWarehouseCode = selectedEwr?.warehouseCode as string | undefined;

  const { data: warehouseProfile } = useGetWarehouseProfileByCode(selectedWarehouseCode ?? "", {
    query: { enabled: !!selectedWarehouseCode, queryKey: getGetWarehouseProfileByCodeQueryKey(selectedWarehouseCode ?? "") },
  });

  // When the user selects an eWR, pre-fill grade from it
  useEffect(() => {
    if (!selectedEwr) return;
    form.setValue("grade", selectedEwr.grade ?? "");
    // Convert MT → kg for weight fields
    const weightKg = parseFloat(selectedEwr.weightMt ?? "0") * 1000;
    if (weightKg > 0) {
      form.setValue("grossWeightKg", weightKg);
      form.setValue("netWeightKg", weightKg);
    }
  }, [selectedEwr?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createLot = useCreateTeaLot({
    mutation: {
      onSuccess: (data: any) => {
        toast({ title: "Lot created", description: "Your direct listing is in DRAFT status." });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
        setLocation(`/lots/${data.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create lot", description: err.message, variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: CreateLotForm) => {
    createLot.mutate({ data: data as any });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="List Tea Direct"
        description="Create a listing from your own eWR. No broker mandate required."
      />

      {teaEwrs.length === 0 && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            You have no available tea eWRs. Your factory will push eWRs here automatically once you
            provide your factory mark in your profile and they are configured to use the factory API.
          </span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card p-8 border border-border shadow-sm">

            {/* eWR selector */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2">
              Select eWR
            </div>

            <FormField control={form.control} name="ewrId" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Electronic Warehouse Receipt</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-none h-11">
                      <SelectValue placeholder={teaEwrs.length === 0 ? "No eWRs available" : "Select an eWR…"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    {teaEwrs.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.ewrsReceiptId} - {e.grade} · {parseFloat(e.weightMt).toFixed(3)} MT · {e.warehouseCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* eWR detail card, shown once an eWR is selected */}
            {selectedEwr && (
              <div className="col-span-1 md:col-span-2 bg-primary/5 border border-primary/20 p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Weight</p>
                  <p className="font-semibold mt-0.5">{parseFloat(selectedEwr.weightMt ?? "0").toFixed(3)} MT</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Harvest Season</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.harvestSeason ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Processing</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.teaProcessingType ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Leaf Grade</p>
                  <p className="font-semibold mt-0.5">{selectedEwr.teaLeafGrade ?? "-"}</p>
                </div>
                <div className="col-span-2 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Warehouse</p>
                  <p className="font-semibold mt-0.5">
                    {warehouseProfile?.operatorName ?? selectedEwr.warehouseCode}
                  </p>
                  {warehouseProfile?.facilityType && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {warehouseProfile.facilityType === "CONTROLLED_ATMOSPHERE_COLD_STORAGE"
                        ? "Controlled Atmosphere / Cold Storage"
                        : warehouseProfile.facilityType === "DRY_GRAIN_SILO"
                        ? "Dry Grain Silo"
                        : warehouseProfile.facilityType}
                    </p>
                  )}
                  {warehouseProfile?.warehouseInChargeName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      In charge: {warehouseProfile.warehouseInChargeName}
                    </p>
                  )}
                </div>
                <div className="col-span-2 md:col-span-4 flex items-center gap-1.5 text-[11px] text-primary/70 pt-1 border-t border-primary/10">
                  <CheckCircle2 className="w-3 h-3" />
                  Grade and weight have been pre-filled from this eWR. Adjust if the physical lot differs.
                </div>
              </div>
            )}

            {/* Lot details */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Lot Details
            </div>

            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade (e.g. BOP, BOPF)</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gradeMark" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Mark (Estate / Factory)</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
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
              Weights
            </div>

            <FormField control={form.control} name="grossWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Gross Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="netWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Net Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tareWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Tare Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Listing */}
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Listing
            </div>

            <FormField control={form.control} name="listingType" render={({ field }) => (
              <FormItem>
                <FormLabel>Listing Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-none h-11"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    <SelectItem value="FIXED_PRICE">Fixed Price (Direct Sale)</SelectItem>
                    <SelectItem value="AUCTION">Auction</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {listingType === "FIXED_PRICE" && (
              <FormField control={form.control} name="fixedPricePerKgUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixed Price (USD / kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {listingType === "AUCTION" && (
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price (USD / kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="tasterRemarks" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Taster Remarks</FormLabel>
                <FormControl>
                  <Textarea {...field} className="rounded-none resize-y p-3" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 border-t border-border pt-6 mt-2">
              <Button type="button" variant="outline" className="rounded-none px-6 h-11" onClick={() => setLocation("/producer")}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8 h-11 font-semibold"
                disabled={createLot.isPending || teaEwrs.length === 0}
              >
                {createLot.isPending ? "Creating…" : "Create Listing"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
