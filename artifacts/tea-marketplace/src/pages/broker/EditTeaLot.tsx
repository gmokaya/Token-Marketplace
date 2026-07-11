import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { useGetTeaLot, useUpdateTeaLot, getGetTeaLotQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";

const updateLotSchema = z.object({
  grade: z.string().min(1),
  gradeMark: z.string().min(1),
  giOrigin: z.string().min(1),
  grossWeightKg: z.coerce.number().min(1),
  netWeightKg: z.coerce.number().min(1),
  tareWeightKg: z.coerce.number().min(0),
  packageType: z.string().min(1),
  listingType: z.enum(["AUCTION", "FIXED_PRICE"]),
  catalogueType: z.enum(["WITH_VALUATION", "WITHOUT_VALUATION"]),
  reservePriceUsd: z.coerce.number().min(0).optional(),
  brokerValuationUsd: z.coerce.number().min(0).optional(),
  tasterRemarks: z.string().optional(),
});

type UpdateLotForm = z.infer<typeof updateLotSchema>;

export default function EditTeaLot() {
  const params = useParams();
  const lotId = Number(params.lotId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useGetTeaLot(lotId, {
    query: {
      enabled: !!lotId,
      queryKey: getGetTeaLotQueryKey(lotId)
    }
  });

  const form = useForm<UpdateLotForm>({
    resolver: zodResolver(updateLotSchema),
  });

  useEffect(() => {
    if (lot) {
      form.reset({
        grade: lot.grade,
        gradeMark: lot.gradeMark,
        giOrigin: lot.giOrigin,
        grossWeightKg: lot.grossWeightKg,
        netWeightKg: lot.netWeightKg,
        tareWeightKg: lot.tareWeightKg,
        packageType: lot.packageType,
        listingType: lot.listingType as any,
        catalogueType: lot.catalogueType as any,
        reservePriceUsd: lot.reservePriceUsd || 0,
        brokerValuationUsd: lot.brokerValuationUsd || 0,
        tasterRemarks: lot.tasterRemarks || "",
      });
    }
  }, [lot, form]);

  const updateLot = useUpdateTeaLot({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lot updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetTeaLotQueryKey(lotId) });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
        setLocation("/broker");
      },
      onError: (err: any) => {
        toast({ title: "Failed to update lot", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: UpdateLotForm) => {
    updateLot.mutate({ lotId, data });
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  if (!lot) {
    return <div>Lot not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Edit Tea Lot"
        description={
          <>
            Lot #{lot.id} — Status: <span className="font-semibold text-foreground uppercase">{lot.status}</span>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card p-8 border border-border shadow-sm">
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2">
              Source & Identification
            </div>
            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gradeMark" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Mark</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Weights & Valuation
            </div>
            
            <FormField control={form.control} name="netWeightKg" render={({ field }) => (
              <FormItem>
                <FormLabel>Net Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="0.1" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

             <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
              <FormItem>
                <FormLabel>Reserve Price (USD/kg)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2 mt-4">
              Remarks
            </div>

            <FormField control={form.control} name="tasterRemarks" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Taster Remarks</FormLabel>
                <FormControl><Textarea {...field} className="rounded-none resize-y p-3" rows={4} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={() => setLocation("/broker")} className="rounded-none px-6 h-11">
              Cancel
            </Button>
            <Button type="submit" className="rounded-none px-8 h-11 font-semibold" disabled={updateLot.isPending}>
              {updateLot.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}