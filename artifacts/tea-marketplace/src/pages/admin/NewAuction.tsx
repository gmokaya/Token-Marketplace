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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Auction Session</h1>
        <p className="text-muted-foreground">Select lots and arrange the catalogue.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border p-6">
            <FormField control={form.control} name="auctionDate" render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Auction Date</FormLabel>
                <FormControl><Input type="date" {...field} className="rounded-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="bg-card border p-6">
            <h3 className="text-lg font-bold mb-4">Select Lots</h3>
            <FormField control={form.control} name="lotIds" render={() => (
              <FormItem>
                {isLoading ? (
                  <div>Loading lots...</div>
                ) : draftLots.length === 0 ? (
                  <div className="text-muted-foreground">No draft/catalogued lots available.</div>
                ) : (
                  <div className="space-y-3">
                    {draftLots.map(lot => (
                      <FormField
                        key={lot.id}
                        control={form.control}
                        name="lotIds"
                        render={({ field }) => {
                          return (
                            <FormItem key={lot.id} className="flex flex-row items-start space-x-3 space-y-0 border p-4 bg-muted/5">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(lot.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, lot.id])
                                      : field.onChange(field.value?.filter((value) => value !== lot.id))
                                  }}
                                  className="rounded-none mt-1"
                                />
                              </FormControl>
                              <div className="flex-1">
                                <FormLabel className="font-semibold text-base cursor-pointer">
                                  {lot.grade} • {lot.gradeMark}
                                </FormLabel>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {lot.netWeightKg} kg | Res: ${lot.reservePriceUsd?.toFixed(2)} | Origin: {lot.giOrigin}
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

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/admin/auctions")} className="rounded-none">
              Cancel
            </Button>
            <Button type="submit" className="rounded-none" disabled={createSession.isPending}>
              Create Session
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}