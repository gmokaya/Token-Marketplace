import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateCoffeeLot, useListEwrs, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Coffee } from "lucide-react";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

const origins = ["Ethiopia", "Colombia", "Kenya", "Guatemala", "Brazil", "Rwanda", "Tanzania", "Burundi", "Peru", "Honduras"];
const processingMethods = ["Washed", "Natural", "Honey", "Wet Hulled"];
const varietals = ["Bourbon", "Typica", "Geisha", "SL28", "SL34", "Heirloom", "Catuai", "Caturra", "Red Bourbon", "Pink Bourbon"];
const packageTypes = ["Jute Bag 60kg", "GrainPro Bag", "Vacuum Sealed", "Grain Bag"];
const coffeeGrades = ["AA", "AB", "PB", "C", "E (Elephant)", "T (Triage)", "Custom"];
const certificationsList = ["Fair Trade", "Rainforest Alliance", "Organic", "UTZ", "Cup of Excellence", "Bird Friendly", "Direct Trade"];

const lotSchema = z.object({
  ewrId: z.coerce.number().min(1, "Please select an eWR"),
  grade: z.string().min(1, "Grade is required"),
  gradeMark: z.string().min(2, "Lot mark must be at least 2 characters"),
  giOrigin: z.string().min(1, "Origin is required"),
  packageType: z.string().min(1, "Package type is required"),
  tareWeightKg: z.coerce.number().min(0, "Tare weight must be non-negative"),
  reservePriceUsd: z.coerce.number().min(0.01, "Reserve price is required"),
  // Coffee-specific
  processingMethod: z.string().min(1, "Processing method is required"),
  varietal: z.string().optional(),
  altitude: z.coerce.number().min(500).max(3000).optional(),
  cuppingRemarks: z.string().optional(),
  certifications: z.array(z.string()).default([]),
});

type LotFormValues = z.infer<typeof lotSchema>;

export default function ProducerNewLot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: ewrs, isLoading: isLoadingEwrs } = useListEwrs({ commodityType: "COFFEE" } as any);
  const createLot = useCreateCoffeeLot();
  const { data: me } = useGetMe();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      certifications: [],
      packageType: "Jute Bag 60kg",
      grade: "AA",
      tareWeightKg: 0,
    },
  });

  const availableEwrs = ewrs?.filter(e => e.state === "INGESTED") || [];
  const selectedEwrId = form.watch("ewrId");
  const selectedEwr = availableEwrs.find(e => e.id === selectedEwrId);

  // Derive gross weight from selected eWR
  const grossWeightKg = selectedEwr ? selectedEwr.weightMt * 1000 : 0;
  const tareWeightKg = form.watch("tareWeightKg") || 0;
  const netWeightKg = Math.max(0, grossWeightKg - tareWeightKg);

  const onSubmit = (data: LotFormValues) => {
    const ewr = availableEwrs.find(e => e.id === data.ewrId);
    if (!ewr) return;

    createLot.mutate(
      {
        data: {
          ewrId: data.ewrId,
          grade: data.grade,
          gradeMark: data.gradeMark,
          giOrigin: data.giOrigin,
          grossWeightKg: ewr.weightMt * 1000,
          netWeightKg: Math.max(0.1, ewr.weightMt * 1000 - data.tareWeightKg),
          tareWeightKg: data.tareWeightKg,
          packageType: data.packageType,
          cuppingRemarks: data.cuppingRemarks,
          processingMethod: data.processingMethod,
          varietal: data.varietal,
          altitude: data.altitude,
          certifications: data.certifications,
          listingType: "AUCTION",
          reservePriceUsd: data.reservePriceUsd,
          commissionRate: 0.01,
          bidSecurityPct: 0.1,
          tickTiers: [],
        },
      },
      {
        onSuccess: (lot) => {
          toast({ title: "Lot Created", description: `Lot "${lot.gradeMark}" has been created successfully.` });
          setLocation("/producer/products");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.error || "Failed to create lot", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/producer/products">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Coffee Lot</h1>
          <p className="text-muted-foreground mt-1">Catalogue a green coffee lot from an existing eWR.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* eWR Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Electronic Warehouse Receipt</CardTitle>
              <CardDescription>Select the COFFEE eWR to back this lot.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="ewrId" render={({ field }) => (
                <FormItem>
                  <FormLabel>eWR</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingEwrs ? "Loading eWRs..." : "Select an eWR"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableEwrs.map((ewr) => (
                        <SelectItem key={ewr.id} value={ewr.id.toString()}>
                          {ewr.ewrsReceiptId} — {ewr.weightMt} MT · {ewr.grade} · {ewr.warehouseCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEwr && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="grid grid-cols-3 gap-2">
                        <div><span className="text-muted-foreground">Gross Weight:</span> <span className="font-mono font-medium">{grossWeightKg.toFixed(0)} kg</span></div>
                        <div><span className="text-muted-foreground">Net Weight:</span> <span className="font-mono font-medium">{netWeightKg.toFixed(0)} kg</span></div>
                        {selectedEwr.coffeeBeanSize && <div><span className="text-muted-foreground">Bean Size:</span> <span className="font-medium">{selectedEwr.coffeeBeanSize}</span></div>}
                        {selectedEwr.coffeeCuppingScore && <div><span className="text-muted-foreground">Cupping Score:</span> <span className="font-medium">{selectedEwr.coffeeCuppingScore}</span></div>}
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="mt-4">
                <FormField control={form.control} name="tareWeightKg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tare Weight (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.1" min="0" {...field} /></FormControl>
                    <FormDescription>Packaging/sack weight deducted from gross to get net weight.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Lot Identification */}
          <Card>
            <CardHeader>
              <CardTitle>Lot Identification</CardTitle>
              <CardDescription>Grade, mark, and geographic origin of this coffee.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coffee Grade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coffeeGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="giOrigin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geographic Origin</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="gradeMark" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot Mark / Brand</FormLabel>
                  <FormControl><Input placeholder="e.g. Yirgacheffe Grade 1 Natural" {...field} /></FormControl>
                  <FormDescription>The identifying name or brand mark for this lot in the auction catalogue.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="packageType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packageTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
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
                    <FormLabel>Varietal <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
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
                  <FormLabel>Altitude (masl) <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input type="number" placeholder="e.g. 1800" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cuppingRemarks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupping Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" placeholder="Describe the cup profile — acidity, body, flavour notes, aftertaste..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Certifications */}
              <div>
                <FormLabel className="text-sm font-medium">Certifications</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {certificationsList.map((cert) => (
                    <FormField key={cert} control={form.control} name="certifications" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
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
              <CardDescription>Set your auction reserve price in USD per kilogram.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price ($/kg)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                  <FormDescription>Minimum price per kilogram you are willing to accept at auction.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 px-6 mt-4 flex justify-between items-center border-t border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Coffee className="w-4 h-4" /> Platform fee is 0.5% upon successful settlement.
              </p>
              <Button type="submit" size="lg" disabled={createLot.isPending}>
                {createLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Lot
              </Button>
            </CardFooter>
          </Card>

        </form>
      </Form>
    </div>
  );
}
