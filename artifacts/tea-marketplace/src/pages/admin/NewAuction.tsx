import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateTeaAuctionSession, useListTeaLots } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

const schema = z.object({
  auctionDate: z.string().min(1, "Date is required"),
  lotIds: z.array(z.number()).min(1, "Select at least one lot"),
});

export default function NewAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lots, isLoading } = useListTeaLots(
    { status: "DRAFT" },
    {
      query: {
        queryKey: ["/api/tea/lots", { status: "DRAFT" }]
      }
    }
  );

  // Just a simple local state to hold selected lots to order them
  const [selectedLots, setSelectedLots] = useState<number[]>([]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      auctionDate: format(new Date(), "yyyy-MM-dd"),
      lotIds: [],
    }
  });

  const createSession = useCreateTeaAuctionSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Auction session created" });
        queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
        setLocation("/admin/auctions");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create session", description: err.message, variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    // Preserve order of selection if desired, or just use the array
    createSession.mutate({ data });
  };

  const draftLots = lots?.filter(l => l.status === "DRAFT" || l.status === "CATALOGUED") || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Create Auction Session"
        description="Select lots and arrange the catalogue."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border p-8 shadow-sm">
            <FormField control={form.control} name="auctionDate" render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel className="text-xs uppercase tracking-widest text-primary font-bold mb-2 block">Auction Date</FormLabel>
                <FormControl><Input type="date" {...field} className="rounded-none h-11" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="bg-card border border-border p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-border pb-3 mb-6">Select Lots for Catalogue</h3>
            <FormField control={form.control} name="lotIds" render={() => (
              <FormItem>
                {isLoading ? (
                  <div className="text-muted-foreground p-4">Loading lots...</div>
                ) : draftLots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center border border-border bg-muted/5">
                    <p className="text-muted-foreground font-medium">No draft or catalogued lots available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {draftLots.map(lot => (
                      <FormField
                        key={lot.id}
                        control={form.control}
                        name="lotIds"
                        render={({ field }) => {
                          return (
                            <FormItem key={lot.id} className="flex flex-row items-start space-x-4 space-y-0 border border-border p-5 bg-muted/5 hover:bg-muted/10 transition-colors">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(lot.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, lot.id])
                                      : field.onChange(field.value?.filter((value) => value !== lot.id))
                                  }}
                                  className="rounded-none mt-1 h-5 w-5"
                                />
                              </FormControl>
                              <div className="flex-1">
                                <FormLabel className="font-bold text-lg cursor-pointer flex items-center gap-3">
                                  <span>{lot.grade}</span> <span className="text-muted-foreground font-medium text-sm mt-0.5">• {lot.gradeMark}</span>
                                </FormLabel>
                                <div className="text-sm text-muted-foreground mt-2 font-medium flex gap-4">
                                  <span><span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">Weight:</span> <span className="font-mono">{lot.netWeightKg} kg</span></span>
                                  <span><span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">Res:</span> <span className="font-mono">${lot.reservePriceUsd?.toFixed(2)}</span></span>
                                  <span><span className="uppercase text-xs tracking-wider font-semibold mr-1 text-foreground">Origin:</span> {lot.giOrigin}</span>
                                </div>
                              </div>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setLocation("/admin/auctions")} className="rounded-none px-6 h-11">
              Cancel
            </Button>
            <Button type="submit" className="rounded-none px-8 h-11 font-semibold" disabled={createSession.isPending}>
              Create Session
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}