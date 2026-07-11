import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateTeaLot } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const createLotSchema = z.object({
  ewrId: z.coerce.number().min(1, "EWR ID is required"),
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(1, "Grade mark is required"),
  giOrigin: z.string().min(1, "GI origin is required"),
  grossWeightKg: z.coerce.number().min(1, "Gross weight must be > 0"),
  netWeightKg: z.coerce.number().min(1, "Net weight must be > 0"),
  tareWeightKg: z.coerce.number().min(0, "Tare weight must be >= 0"),
  packageType: z.string().min(1, "Package type is required"),
  listingType: z.enum(["AUCTION", "FIXED_PRICE"]),
  catalogueType: z.enum(["WITH_VALUATION", "WITHOUT_VALUATION"]),
  reservePriceUsd: z.coerce.number().min(0, "Reserve price is required").optional(),
  brokerValuationUsd: z.coerce.number().min(0).optional(),
  tasterRemarks: z.string().optional(),
});

type CreateLotForm = z.infer<typeof createLotSchema>;

export default function NewTeaLot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      brokerValuationUsd: 0,
      tasterRemarks: "",
    }
  });

  const createLot = useCreateTeaLot({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Lot created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
        setLocation(`/broker/lots/${data.id}/edit`);
      },
      onError: (err: any) => {
        toast({ title: "Failed to create lot", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: CreateLotForm) => {
    createLot.mutate({ data });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Tea Lot</h1>
        <p className="text-muted-foreground mt-1">Draft a new catalogue entry from an eWR.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-card p-8 border border-border shadow-sm">
            <div className="col-span-1 md:col-span-2 text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-2">
              Source & Identification
            </div>
            
            <FormField control={form.control} name="ewrId" render={({ field }) => (
              <FormItem>
                <FormLabel>eWR ID</FormLabel>
                <FormControl><Input type="number" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade (e.g. BP1, PF1)</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="gradeMark" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Mark (Estate/Factory)</FormLabel>
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

            <FormField control={form.control} name="packageType" render={({ field }) => (
              <FormItem>
                <FormLabel>Package Type</FormLabel>
                <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

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

            <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
              <FormItem>
                <FormLabel>Reserve Price (USD/kg)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="brokerValuationUsd" render={({ field }) => (
              <FormItem>
                <FormLabel>Broker Valuation (USD/kg)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
            <Button type="submit" className="rounded-none px-8 h-11 font-semibold" disabled={createLot.isPending}>
              {createLot.isPending ? "Creating..." : "Create Draft Lot"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}