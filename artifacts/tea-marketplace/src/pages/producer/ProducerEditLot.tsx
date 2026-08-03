/**
 * Producer Edit Lot
 * Allows a PRODUCER to update their own DRAFT or CATALOGUED lot.
 * Mirrors the broker EditTeaLot but supports both FIXED_PRICE and AUCTION listing types,
 * and navigates back to the lot detail on save.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import {
  useGetTeaLot,
  useUpdateTeaLot,
  getGetTeaLotQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { AlertCircle } from "lucide-react";

const updateLotSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(1, "Grade mark is required"),
  giOrigin: z.string().min(1, "GI origin is required"),
  grossWeightKg: z.coerce.number().min(0.001),
  netWeightKg: z.coerce.number().min(0.001),
  tareWeightKg: z.coerce.number().min(0),
  packageType: z.string().min(1),
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

type UpdateLotForm = z.infer<typeof updateLotSchema>;

export default function ProducerEditLot() {
  const params = useParams();
  const lotId = Number(params.lotId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useGetTeaLot(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotQueryKey(lotId) },
  });

  const form = useForm<UpdateLotForm>({
    resolver: zodResolver(updateLotSchema),
  });

  const listingType = form.watch("listingType");

  useEffect(() => {
    if (!lot) return;
    form.reset({
      grade: lot.grade,
      gradeMark: lot.gradeMark,
      giOrigin: lot.giOrigin,
      grossWeightKg: parseFloat(String(lot.grossWeightKg)),
      netWeightKg: parseFloat(String(lot.netWeightKg)),
      tareWeightKg: parseFloat(String(lot.tareWeightKg)),
      packageType: lot.packageType,
      listingType: (lot.listingType as "AUCTION" | "FIXED_PRICE") ?? "FIXED_PRICE",
      reservePriceUsd: lot.reservePriceUsd ? parseFloat(String(lot.reservePriceUsd)) : undefined,
      fixedPricePerKgUsd: lot.fixedPricePerKgUsd ? parseFloat(String(lot.fixedPricePerKgUsd)) : undefined,
      tasterRemarks: lot.tasterRemarks ?? "",
    });
  }, [lot, form]);

  const updateLot = useUpdateTeaLot({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lot updated", description: "Your changes have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetTeaLotQueryKey(lotId) });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
        setLocation(`/lots/${lotId}`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update lot", description: err.message, variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: UpdateLotForm) => {
    updateLot.mutate({ lotId, data });
  };

  if (isLoading) return <Skeleton className="w-full h-[600px]" />;
  if (!lot) return <div className="p-8 text-muted-foreground">Lot not found.</div>;

  const canEdit = ["DRAFT", "CATALOGUED"].includes(lot.status);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Edit Direct Listing"
        description={`Lot #${lot.id} · ${lot.grade} - ${lot.gradeMark}`}
      />

      {!canEdit && (
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            This lot is in <strong>{lot.status}</strong> status and cannot be edited.
            Only DRAFT and CATALOGUED lots may be modified.
          </span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card p-8 border border-border shadow-sm">

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2">
              Identification
            </div>

            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade (e.g. BOP, BOPF)</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gradeMark" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Mark (Estate / Factory)</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="giOrigin" render={({ field }) => (
              <FormItem>
                <FormLabel>GI Origin</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="packageType" render={({ field }) => (
              <FormItem>
                <FormLabel>Package Type</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Weights
            </div>

            <FormField control={form.control} name="grossWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Gross Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="netWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Net Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="tareWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Tare Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.001" {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Pricing
            </div>

            <FormField control={form.control} name="listingType" render={({ field }) => (
              <FormItem>
                <FormLabel>Listing Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
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
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {listingType === "AUCTION" && (
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price (USD / kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" disabled={!canEdit} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="tasterRemarks" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Taster Remarks</FormLabel>
                <FormControl>
                  <Textarea {...field} className="rounded-none resize-y p-3" rows={3} disabled={!canEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 border-t border-border pt-6 mt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none px-6 h-11"
                onClick={() => setLocation(`/lots/${lotId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8 h-11 font-semibold"
                disabled={updateLot.isPending || !canEdit}
              >
                {updateLot.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
