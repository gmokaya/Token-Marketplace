import { useState } from "react";
import { 
  useGetMyMandates, 
  useGetMandatesGiven, 
  useCreateBrokerMandate,
  useRevokeBrokerMandate,
  useGetMe,
  getGetMyMandatesQueryKey,
  getGetMandatesGivenQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { FileText, ShieldX, Plus } from "lucide-react";
import { format } from "date-fns";

const mandateSchema = z.object({
  brokerId: z.coerce.number().min(1),
  commodityType: z.literal("TEA"),
  commissionRateOverride: z.coerce.number().min(0).max(100).optional(),
  validTo: z.string().min(1).optional(),
});

export default function Mandates() {
  const { data: user } = useGetMe();
  const isBroker = user?.tier === "ENABLER";
  const isProducer = user?.tier === "PRODUCER";

  const { data: myMandates, isLoading: loadingMy, isError: errorMy } = useGetMyMandates({
    query: { enabled: isBroker, queryKey: getGetMyMandatesQueryKey() }
  });

  const { data: givenMandates, isLoading: loadingGiven, isError: errorGiven } = useGetMandatesGiven({
    query: { enabled: isProducer, queryKey: getGetMandatesGivenQueryKey() }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMandate = useCreateBrokerMandate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mandate created" });
        queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
        setOpen(false);
      }
    }
  });

  const revokeMandate = useRevokeBrokerMandate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mandate revoked" });
        queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMyMandatesQueryKey() });
      }
    }
  });

  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof mandateSchema>>({
    resolver: zodResolver(mandateSchema),
    defaultValues: {
      commodityType: "TEA",
      brokerId: 0,
      commissionRateOverride: 1.5,
      validTo: "",
    }
  });

  const onSubmit = (data: z.infer<typeof mandateSchema>) => {
    createMandate.mutate({ data: { ...data, validFrom: format(new Date(), "yyyy-MM-dd") } });
  };

  const mandates = isBroker ? myMandates : givenMandates;
  const isLoading = isBroker ? loadingMy : loadingGiven;
  const isError = isBroker ? errorMy : errorGiven;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broker Mandates</h1>
          <p className="text-muted-foreground">
            {isBroker ? "Mandates granted to you by producers." : "Mandates you have granted to brokers."}
          </p>
        </div>

        {isProducer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-none gap-2"><Plus className="w-4 h-4" /> Grant Mandate</Button>
            </DialogTrigger>
            <DialogContent className="rounded-none sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Grant Broker Mandate</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField control={form.control} name="brokerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker User ID</FormLabel>
                      <FormControl><Input type="number" {...field} className="rounded-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="commissionRateOverride" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Override (%)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} className="rounded-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="validTo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl><Input type="date" {...field} className="rounded-none" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full rounded-none mt-4" disabled={createMandate.isPending}>
                    Grant Mandate
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          [1,2].map(i => <Skeleton key={i} className="h-32 w-full" />)
        ) : isError ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <span>Failed to load mandates. Please try again.</span>
          </div>
        ) : mandates?.length === 0 ? (
          <div className="text-center p-16 border border-dashed">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <div className="text-muted-foreground text-lg">No active mandates.</div>
          </div>
        ) : (
          mandates?.map(m => (
            <Card key={m.id} className="rounded-none shadow-none flex flex-col sm:flex-row items-center justify-between p-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold font-mono">Mandate #{m.id}</h3>
                  <Badge variant={!m.revoked ? 'default' : 'secondary'} className="rounded-none">
                    {!m.revoked ? 'ACTIVE' : 'REVOKED'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground max-w-md">
                  <div>
                    <span className="font-semibold">Broker ID:</span> {m.brokerId}
                  </div>
                  <div>
                    <span className="font-semibold">Owner ID:</span> {m.ownerId}
                  </div>
                  <div>
                    <span className="font-semibold">Commission:</span> {m.commissionRateOverride ? m.commissionRateOverride + '%' : 'Default'}
                  </div>
                  <div>
                    <span className="font-semibold">Valid Until:</span> {m.validTo ? new Date(m.validTo).toLocaleDateString() : 'Indefinite'}
                  </div>
                </div>
              </div>
              
              {!m.revoked && isProducer && (
                <div className="mt-4 sm:mt-0">
                  <Button 
                    variant="destructive" 
                    className="rounded-none gap-2"
                    onClick={() => revokeMandate.mutate({ mandateId: m.id })}
                    disabled={revokeMandate.isPending}
                  >
                    <ShieldX className="w-4 h-4" /> Revoke
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}