import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTeaLot, useListEwrs, useGetMe } from "@workspace/api-client-react";
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
const varietals = ["Bourbon", "Typica", "Geisha", "SL28", "SL34", "Heirloom", "Catuai", "Caturra"];
const certificationsList = ["Fair Trade", "Rainforest Alliance", "Organic", "UTZ", "Cup of Excellence", "Bird Friendly"];

const lotSchema = z.object({
  ewrId: z.coerce.number().min(1, "Please select an eWR"),
  lotName: z.string().min(5, "Name must be at least 5 characters"),
  description: z.string().min(10, "Description is required"),
  reservePriceUsd: z.coerce.number().min(1, "Reserve price is required"),
  openingBidUsd: z.coerce.number().min(1, "Opening bid is required"),
  
  // These aren't in the base TeaLotInput but we'll encode them into description or custom fields if possible.
  // For the sake of the exercise, we will assume the backend accepts them or we pack them into description.
  processingMethod: z.string().min(1, "Processing method is required"),
  origin: z.string().min(1, "Origin is required"),
  varietal: z.string().min(1, "Varietal is required"),
  altitude: z.coerce.number().min(500, "Altitude must be reasonable"),
  certifications: z.array(z.string()).default([]),
});

type LotFormValues = z.infer<typeof lotSchema>;

export default function ProducerNewLot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: ewrs, isLoading: isLoadingEwrs } = useListEwrs({ commodityType: "COFFEE" } as any);
  const createLot = useCreateTeaLot();
  const { data: me } = useGetMe();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      certifications: [],
    },
  });

  const availableEwrs = ewrs?.filter(e => e.state === "INGESTED") || [];

  const onSubmit = (data: LotFormValues) => {
    // Since TeaLot might not have explicit fields for all coffee attributes in this API version,
    // we format a rich description that includes them, or pass them if the schema allows.
    // Looking at CreateTeaLotRequest: ewrId, lotName, description, reservePriceUsd, openingBidUsd, weightMt.
    
    const selectedEwr = availableEwrs.find(e => e.id === data.ewrId);
    if (!selectedEwr) return;

    const richDescription = `
      ${data.description}
      
      ---
      Origin: ${data.origin}
      Processing: ${data.processingMethod}
      Varietal: ${data.varietal}
      Altitude: ${data.altitude} masl
      Certifications: ${data.certifications.join(", ") || "None"}
    `.trim();

    createLot.mutate(
      {
        data: {
          ewrId: data.ewrId,
          lotName: data.lotName,
          description: richDescription,
          reservePriceUsd: data.reservePriceUsd,
          openingBidUsd: data.openingBidUsd,
          weightMt: selectedEwr.weightMt, // Inherit from EWR
        } as any // Cast for now if types mismatch slightly
      },
      {
        onSuccess: () => {
          toast({ title: "Lot Created", description: "Your lot has been successfully created." });
          setLocation("/producer/products");
        },
        onError: (err) => {
          toast({ title: "Error", description: err.error || "Failed to create lot", variant: "destructive" });
        }
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
          <h1 className="text-3xl font-bold tracking-tight">Create Green Coffee Lot</h1>
          <p className="text-muted-foreground mt-1">List your inventory on the spot market or an upcoming auction.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Source Inventory</CardTitle>
              <CardDescription>Select an available eWR to back this lot.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="ewrId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Electronic Warehouse Receipt (eWR)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingEwrs ? "Loading..." : "Select an eWR"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableEwrs.length === 0 && !isLoadingEwrs ? (
                        <SelectItem value="0" disabled>No available eWRs found</SelectItem>
                      ) : (
                        availableEwrs.map(ewr => (
                          <SelectItem key={ewr.id} value={ewr.id.toString()}>
                            {ewr.ewrsReceiptId} — {ewr.weightMt} MT ({ewr.coffeeBeanSize || ewr.grade})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Only ingested eWRs without active liens can be listed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lot Details</CardTitle>
              <CardDescription>Marketing information that buyers will see.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="lotName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Yirgacheffe Washed Grade 1" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="origin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="processingMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processing Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {processingMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="varietal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Varietal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select varietal" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {varietals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="altitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altitude (masl)</FormLabel>
                    <FormControl><Input type="number" {...field} placeholder="1800" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="certifications" render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Certifications</FormLabel>
                    <FormDescription>Select all that apply to this lot.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {certificationsList.map((cert) => (
                      <FormField
                        key={cert}
                        control={form.control}
                        name="certifications"
                        render={({ field }) => {
                          return (
                            <FormItem key={cert} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(cert)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, cert])
                                      : field.onChange(field.value?.filter((value) => value !== cert))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">{cert}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tasting Notes & Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[120px]" placeholder="Describe the cup profile, farm story, and any other relevant details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set your market expectations in USD per Metric Ton.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price ($/MT)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Minimum price you are willing to accept.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="openingBidUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Bid ($/MT)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>Starting price for auction sessions.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 px-6 mt-4 flex justify-between items-center border-t border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Coffee className="w-4 h-4" /> Platform fee is 1.5% upon successful settlement.
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
