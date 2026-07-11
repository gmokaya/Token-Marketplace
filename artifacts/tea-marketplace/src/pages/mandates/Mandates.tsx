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
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Broker Mandates"
        description={isBroker ? "Mandates granted to you by producers." : "Mandates you have granted to brokers."}
        actions={
          isProducer && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-none gap-2"><Plus className="w-4 h-4" /> Grant Mandate</Button>
              </DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Grant Broker Mandate</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    <FormField control={form.control} name="brokerId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker User ID</FormLabel>
                        <FormControl><Input type="number" {...field} className="rounded-none h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="commissionRateOverride" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Override (%)</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} className="rounded-none h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="validTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until</FormLabel>
                        <FormControl><Input type="date" {...field} className="rounded-none h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full rounded-none mt-6 h-11 font-semibold" disabled={createMandate.isPending}>
                      Grant Mandate
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-6">
        {isLoading ? (
          [1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-none" />)
        ) : isError ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground border border-border bg-muted/5">
            <span>Failed to load mandates. Please try again.</span>
          </div>
        ) : mandates?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No active mandates</h3>
            <p className="text-muted-foreground mt-1">You have no active broker mandates at this time.</p>
          </div>
        ) : (
          mandates?.map(m => (
            <Card key={m.id} className="rounded-none shadow-sm border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 hover:border-primary/30 transition-colors">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">Mandate #{m.id}</h3>
                  <Badge variant={!m.revoked ? 'default' : 'secondary'} className="rounded-none px-2 py-1 text-[10px] tracking-wider">
                    {!m.revoked ? 'ACTIVE' : 'REVOKED'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Broker ID</div>
                    <div className="font-mono font-medium">{m.brokerId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Owner ID</div>
                    <div className="font-mono font-medium">{m.ownerId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Commission</div>
                    <div className="font-medium">{m.commissionRateOverride ? m.commissionRateOverride + '%' : 'Default'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Valid Until</div>
                    <div className="font-medium">{m.validTo ? new Date(m.validTo).toLocaleDateString() : 'Indefinite'}</div>
                  </div>
                </div>
              </div>
              
              {!m.revoked && isProducer && (
                <div className="mt-6 sm:mt-0 sm:ml-6 shrink-0">
                  <Button 
                    variant="destructive" 
                    className="rounded-none gap-2 h-11"
                    onClick={() => revokeMandate.mutate({ mandateId: m.id })}
                    disabled={revokeMandate.isPending}
                  >
                    <ShieldX className="w-4 h-4" /> Revoke Mandate
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