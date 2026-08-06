import { Link, useParams, useLocation } from "wouter";
import { useGetCoffeeLot, useUpdateCoffeeLot, getGetCoffeeLotQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const processingMethods = ["Washed", "Natural", "Honey", "Wet Hulled"];
const varietals = ["Bourbon", "Typica", "Geisha", "SL28", "SL34", "Heirloom", "Catuai", "Caturra", "Red Bourbon", "Pink Bourbon"];

const lotSchema = z.object({
  gradeMark: z.string().min(2, "Lot mark must be at least 2 characters"),
  cuppingRemarks: z.string().optional(),
  processingMethod: z.string().optional(),
  varietal: z.string().optional(),
  altitude: z.coerce.number().min(500).max(3000).optional(),
  reservePriceUsd: z.coerce.number().min(0.01, "Reserve price is required"),
});

type LotFormValues = z.infer<typeof lotSchema>;

export default function ProducerEditLot() {
  const { lotId } = useParams<{ lotId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useGetCoffeeLot(Number(lotId), {
    query: { enabled: !!lotId, queryKey: getGetCoffeeLotQueryKey(Number(lotId)) },
  });
  const updateLot = useUpdateCoffeeLot();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      gradeMark: "",
      cuppingRemarks: "",
      processingMethod: "",
      varietal: "",
      reservePriceUsd: 0,
    },
  });

  useEffect(() => {
    if (lot) {
      form.reset({
        gradeMark: lot.gradeMark,
        cuppingRemarks: lot.cuppingRemarks ?? "",
        processingMethod: lot.processingMethod ?? "",
        varietal: lot.varietal ?? "",
        altitude: lot.altitude ?? undefined,
        reservePriceUsd: lot.reservePriceUsd ?? 0,
      });
    }
  }, [lot, form]);

  const onSubmit = (data: LotFormValues) => {
    if (!lotId) return;

    updateLot.mutate(
      {
        lotId: Number(lotId),
        data: {
          gradeMark: data.gradeMark,
          cuppingRemarks: data.cuppingRemarks,
          processingMethod: data.processingMethod,
          varietal: data.varietal,
          altitude: data.altitude,
          reservePriceUsd: data.reservePriceUsd,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lot Updated", description: "Changes have been saved successfully." });
          queryClient.invalidateQueries({ queryKey: getGetCoffeeLotQueryKey(Number(lotId)) });
          setLocation("/producer/products");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.error || "Failed to update lot", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="max-w-3xl mx-auto space-y-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!lot) {
    return <div className="text-center py-12">Lot not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/producer/products">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Lot: {lot.gradeMark}</h1>
          <p className="text-muted-foreground mt-1">
            {lot.grade} · {lot.giOrigin} · Status: <span className="font-medium">{lot.status}</span>
          </p>
        </div>
      </div>

      {/* eWR summary (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Lot Summary</CardTitle>
          <CardDescription>Details inherited from the eWR - not editable here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Grade</div>
              <div className="font-medium">{lot.grade}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Origin</div>
              <div className="font-medium">{lot.giOrigin}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Net Weight</div>
              <div className="font-mono font-medium">{(lot.netWeightKg / 1000).toFixed(2)} MT</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-0.5">Package</div>
              <div className="font-medium">{lot.packageType}</div>
            </div>
            {lot.coffeeBeanSize && (
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">Bean Size (eWR)</div>
                <div className="font-medium">{lot.coffeeBeanSize}</div>
              </div>
            )}
            {lot.coffeeCuppingScore != null && (
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">Cupping Score (eWR)</div>
                <div className="font-medium">{lot.coffeeCuppingScore}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lot Identification</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="gradeMark" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot Mark / Brand</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormDescription>The identifying name for this lot in the auction catalogue.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coffee Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="processingMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processing Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {processingMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="varietal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varietal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select varietal" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {varietals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="altitude" render={({ field }) => (
                <FormItem>
                  <FormLabel>Altitude (masl)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cuppingRemarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupping Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[120px]" placeholder="Describe the cup profile - acidity, body, flavour notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price ($/kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                  <FormDescription>Minimum per-kilogram price you will accept at auction.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 px-6 mt-4 flex justify-between items-center border-t border-border">
              <p className="text-sm text-muted-foreground">Changes apply immediately.</p>
              <Button type="submit" size="lg" disabled={updateLot.isPending || lot.status === 'SOLD'}>
                {updateLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
