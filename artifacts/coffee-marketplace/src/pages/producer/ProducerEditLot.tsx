import { Link, useParams, useLocation } from "wouter";
import { useGetTeaLot, useUpdateTeaLot } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTeaLotQueryKey } from "@workspace/api-client-react";

const lotSchema = z.object({
  lotName: z.string().min(5, "Name must be at least 5 characters"),
  description: z.string().min(10, "Description is required"),
  reservePriceUsd: z.coerce.number().min(1, "Reserve price is required"),
  openingBidUsd: z.coerce.number().min(1, "Opening bid is required"),
});

type LotFormValues = z.infer<typeof lotSchema>;

export default function ProducerEditLot() {
  const { lotId } = useParams<{ lotId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isLoading } = useGetTeaLot(Number(lotId), { query: { enabled: !!lotId, queryKey: getGetTeaLotQueryKey(Number(lotId)) } });
  const updateLot = useUpdateTeaLot();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      lotName: "",
      description: "",
      reservePriceUsd: 0,
      openingBidUsd: 0,
    },
  });

  useEffect(() => {
    if (lot) {
      form.reset({
        lotName: lot.lotName,
        description: lot.description,
        reservePriceUsd: lot.reservePriceUsd,
        openingBidUsd: lot.openingBidUsd || lot.reservePriceUsd,
      });
    }
  }, [lot, form]);

  const onSubmit = (data: LotFormValues) => {
    if (!lotId) return;

    updateLot.mutate(
      {
        lotId: Number(lotId),
        data: {
          lotName: data.lotName,
          description: data.description,
          reservePriceUsd: data.reservePriceUsd,
          openingBidUsd: data.openingBidUsd,
        } as any
      },
      {
        onSuccess: () => {
          toast({ title: "Lot Updated", description: "Changes have been saved successfully." });
          queryClient.invalidateQueries({ queryKey: getGetTeaLotQueryKey(Number(lotId)) });
          setLocation("/producer/products");
        },
        onError: (err) => {
          toast({ title: "Error", description: err.error || "Failed to update lot", variant: "destructive" });
        }
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Lot: {lot.lotName}</h1>
          <p className="text-muted-foreground mt-1">Status: {lot.status}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="lotName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[160px]" {...field} />
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
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="reservePriceUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserve Price ($/MT)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="openingBidUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Bid ($/MT)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
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
