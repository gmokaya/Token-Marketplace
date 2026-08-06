import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetCoffeeLot, useUpdateCoffeeLot, getListCoffeeLotsQueryKey, getGetCoffeeLotQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Coffee, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const origins = ["Ethiopia", "Colombia", "Kenya", "Guatemala", "Brazil", "Rwanda", "Tanzania", "Burundi", "Peru", "Honduras"];
const processingMethods = ["Washed", "Natural", "Honey", "Wet Hulled"];
const varietals = ["Bourbon", "Typica", "Geisha", "SL28", "SL34", "Heirloom", "Catuai", "Caturra", "Red Bourbon", "Pink Bourbon"];
const packageTypes = ["Jute Bag 60kg", "GrainPro Bag", "Vacuum Sealed", "Grain Bag"];
const coffeeGrades = ["AA", "AB", "PB", "C", "E (Elephant)", "T (Triage)", "Custom"];
const certificationsList = ["Fair Trade", "Rainforest Alliance", "Organic", "UTZ", "Cup of Excellence", "Bird Friendly", "Direct Trade"];

// API allows editing DRAFT and CATALOGUED lots
const EDITABLE_STATUSES = ["DRAFT", "CATALOGUED"];

const editSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(2, "Lot mark must be at least 2 characters"),
  giOrigin: z.string().min(1, "Origin is required"),
  packageType: z.string().min(1, "Package type is required"),
  reservePriceUsd: z.coerce.number().min(0.01, "Reserve price is required"),
  processingMethod: z.string().optional(),
  varietal: z.string().optional(),
  altitude: z.coerce.number().min(500).max(3000).optional(),
  cuppingRemarks: z.string().optional(),
  certifications: z.array(z.string()).default([]),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EditBrokeredLot() {
  const { lotId } = useParams<{ lotId: string }>();
  const id = parseInt(lotId ?? "", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useGetCoffeeLot(id, {
    query: { enabled: !isNaN(id), queryKey: getGetCoffeeLotQueryKey(id) },
  });
  const updateLot = useUpdateCoffeeLot();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { certifications: [] },
  });

  // Populate form once lot loads
  useEffect(() => {
    if (!lot) return;
    form.reset({
      grade: lot.grade ?? "",
      gradeMark: lot.gradeMark ?? "",
      giOrigin: lot.giOrigin ?? "",
      packageType: lot.packageType ?? "Jute Bag 60kg",
      reservePriceUsd: lot.reservePriceUsd ?? 0,
      processingMethod: lot.processingMethod ?? undefined,
      varietal: lot.varietal ?? undefined,
      altitude: lot.altitude ?? undefined,
      cuppingRemarks: lot.cuppingRemarks ?? "",
      certifications: (lot.certifications as string[]) ?? [],
    });
  }, [lot, form]);

  const isEditable = lot && EDITABLE_STATUSES.includes(lot.status);

  const onSubmit = (data: EditFormValues) => {
    if (!lot || !isEditable) return;
    updateLot.mutate(
      {
        lotId: id,
        data: {
          grade: data.grade,
          gradeMark: data.gradeMark,
          giOrigin: data.giOrigin,
          packageType: data.packageType,
          reservePriceUsd: data.reservePriceUsd,
          processingMethod: data.processingMethod,
          varietal: data.varietal,
          altitude: data.altitude,
          cuppingRemarks: data.cuppingRemarks,
          certifications: data.certifications,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lot Updated", description: `"${data.gradeMark}" has been updated.` });
          queryClient.invalidateQueries({ queryKey: getListCoffeeLotsQueryKey() });
          setLocation("/broker/lots");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.error || "Failed to update lot", variant: "destructive" });
        },
      }
    );
  };

  if (isNaN(id)) {
    return <div className="text-center py-12 text-muted-foreground">Invalid lot ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Lot not found.</p>
        <Link href="/broker/lots">
          <Button variant="link" className="mt-2">Back to Lots</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/broker/lots">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">Edit Lot</h1>
            <Badge variant="secondary" className="font-mono">{lot.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{lot.gradeMark}</p>
        </div>
      </div>

      {!isEditable && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            This lot is in <strong>{lot.status}</strong> status and can no longer be edited.
            Only lots with status PENDING or DRAFT can be modified.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Lot Identification */}
          <Card>
            <CardHeader>
              <CardTitle>Lot Identification</CardTitle>
              <CardDescription>Grade, mark, and geographic origin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coffee Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl>
                      <SelectContent>{coffeeGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="giOrigin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geographic Origin</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger></FormControl>
                      <SelectContent>{origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="gradeMark" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot Mark / Brand</FormLabel>
                  <FormControl><Input placeholder="e.g. Yirgacheffe Grade 1 Natural" disabled={!isEditable} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="packageType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger></FormControl>
                    <SelectContent>{packageTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Coffee Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Coffee Profile</CardTitle>
              <CardDescription>Processing, varietal, altitude, and cupping notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="processingMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processing Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                      <SelectContent>{processingMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="varietal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varietal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select varietal" /></SelectTrigger></FormControl>
                      <SelectContent>{varietals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="altitude" render={({ field }) => (
                <FormItem>
                  <FormLabel>Altitude (masl)</FormLabel>
                  <FormControl><Input type="number" disabled={!isEditable} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cuppingRemarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupping Notes</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" disabled={!isEditable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                <FormLabel className="text-sm font-medium">Certifications</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {certificationsList.map((cert) => (
                    <FormField key={cert} control={form.control} name="certifications" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            disabled={!isEditable}
                            checked={field.value?.includes(cert)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...(field.value || []), cert]
                                : (field.value || []).filter((v: string) => v !== cert);
                              field.onChange(updated);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">{cert}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Auction reserve price in USD per kilogram.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price ($/kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" disabled={!isEditable} {...field} /></FormControl>
                  <FormDescription>Minimum price per kilogram the producer will accept at auction.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            {isEditable && (
              <CardFooter className="bg-muted/50 py-4 px-6 mt-4 flex justify-between items-center border-t border-border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Coffee className="w-4 h-4" /> Changes apply immediately. Lot remains in draft until published.
                </p>
                <Button type="submit" size="lg" disabled={updateLot.isPending}>
                  {updateLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            )}
          </Card>

        </form>
      </Form>
    </div>
  );
}
