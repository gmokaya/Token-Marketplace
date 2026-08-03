import { useState } from "react";
import {
  useGetMyMandates,
  useGetMandatesGiven,
  useCreateBrokerMandate,
  useRevokeBrokerMandate,
  useGetMe,
  getGetMyMandatesQueryKey,
  getGetMandatesGivenQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { FileText, ShieldX, Plus, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BrokerUser {
  id: number;
  name: string;
  email: string;
  company: string | null;
  tier: string;
}

const mandateSchema = z.object({
  brokerId: z.coerce.number().min(1, "Select a broker"),
  commodityType: z.literal("TEA"),
  commissionRateOverride: z.coerce.number().min(0).max(100).optional(),
  validTo: z.string().optional(),
});

function isActive(m: { revoked: boolean; validFrom?: string | null; validTo?: string | null }) {
  if (m.revoked) return false;
  const now = new Date();
  const from = m.validFrom ? new Date(m.validFrom) : null;
  const to = m.validTo ? new Date(m.validTo) : null;
  return (from === null || from <= now) && (to === null || to > now);
}

export default function Mandates() {
  const { data: user } = useGetMe();
  const isBroker = user?.tier === "ENABLER";
  const isProducer = user?.tier === "PRODUCER" || user?.tier === "COOPERATIVE";
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Broker list for the grant-mandate picker (producer only)
  const { data: brokers = [] } = useQuery<BrokerUser[]>({
    queryKey: ["/api/users/brokers"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/users/brokers`, { signal });
      if (!res.ok) throw new Error("Failed to load brokers");
      return res.json();
    },
    enabled: isProducer,
  });

  const { data: myMandates, isLoading: loadingMy } = useGetMyMandates({
    query: { enabled: isBroker, queryKey: getGetMyMandatesQueryKey() },
  });

  const { data: givenMandates, isLoading: loadingGiven } = useGetMandatesGiven({
    query: { enabled: isProducer, queryKey: getGetMandatesGivenQueryKey() },
  });

  const createMandate = useCreateBrokerMandate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mandate granted" });
        queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to grant mandate", description: err?.message, variant: "destructive" });
      },
    },
  });

  const revokeMandate = useRevokeBrokerMandate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Mandate revoked" });
        queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMyMandatesQueryKey() });
      },
    },
  });

  const form = useForm<z.infer<typeof mandateSchema>>({
    resolver: zodResolver(mandateSchema),
    defaultValues: { commodityType: "TEA", brokerId: 0, commissionRateOverride: 1.5, validTo: "" },
  });

  const onSubmit = (data: z.infer<typeof mandateSchema>) => {
    createMandate.mutate({
      data: {
        ...data,
        // API stores commission as decimal ratio; form shows percentage
        commissionRateOverride: data.commissionRateOverride != null
          ? data.commissionRateOverride / 100
          : undefined,
        validFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        validTo: data.validTo ? `${data.validTo}T23:59:59+00:00` : undefined,
      },
    });
  };

  const mandates = isBroker ? myMandates : givenMandates;
  const isLoading = isBroker ? loadingMy : loadingGiven;

  const commissionDisplay = (raw: string | null | undefined) => {
    if (!raw) return "Default";
    const pct = parseFloat(raw) * 100;
    return `${pct.toFixed(2)}%`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Broker Mandates"
        description={
          isBroker
            ? "Mandates granted to you by producers. These authorise you to catalogue their eWRs."
            : "Mandates you have granted to brokers. Brokers can only list your eWRs once you grant one."
        }
        actions={
          isProducer && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-none h-10 px-5 gap-2">
                  <Plus className="w-4 h-4" /> Grant Mandate
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Grant Broker Mandate</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-2">
                  Select a registered broker. They will be able to catalogue your INGESTED TEA eWRs
                  until you revoke this mandate.
                </p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

                    <FormField control={form.control} name="brokerId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : ""}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-none h-11">
                              <SelectValue placeholder={brokers.length === 0 ? "No registered brokers" : "Select a broker…"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none">
                            {brokers.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                <span className="font-semibold">{b.name}</span>
                                {b.company && (
                                  <span className="text-muted-foreground ml-2">· {b.company}</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="commissionRateOverride" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" max="100" {...field} className="rounded-none h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="validTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until <span className="text-muted-foreground font-normal">(leave blank for open-ended)</span></FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="rounded-none h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button
                      type="submit"
                      className="w-full rounded-none mt-6 h-11 font-semibold"
                      disabled={createMandate.isPending || brokers.length === 0}
                    >
                      {createMandate.isPending ? "Granting…" : "Grant Mandate"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-none" />)}
        </div>
      ) : !mandates?.length ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No mandates yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {isBroker
              ? "No producers have granted you a mandate. Ask a producer to visit Mandates and grant one to you."
              : "You haven't granted any mandates. Use the button above to authorise a registered broker to catalogue your tea."}
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {mandates.map((m) => {
            const active = isActive(m);
            const brokerName = (m as any).brokerName as string | null;
            const ownerName  = (m as any).ownerName  as string | null;
            const counterpart = isBroker ? ownerName : brokerName;

            return (
              <div key={m.id} className="px-6 py-5 flex items-start sm:items-center justify-between gap-6 flex-col sm:flex-row">
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-base">{counterpart ?? `ID #${isBroker ? m.ownerId : m.brokerId}`}</span>
                    <Badge
                      variant="outline"
                      className={`rounded-none text-[10px] uppercase tracking-wider ${
                        active ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {active ? <><ShieldCheck className="w-3 h-3 mr-1" />Active</> : m.revoked ? "Revoked" : "Expired"}
                    </Badge>
                    <Badge variant="secondary" className="rounded-none text-[10px]">TEA</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Commission</p>
                      <p className="font-medium mt-0.5">{commissionDisplay(m.commissionRateOverride != null ? String(m.commissionRateOverride) : null)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Valid From</p>
                      <p className="font-medium mt-0.5">
                        {m.validFrom ? new Date(m.validFrom).toLocaleDateString() : "Immediately"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Valid Until</p>
                      <p className="font-medium mt-0.5">
                        {m.validTo ? new Date(m.validTo).toLocaleDateString() : "Open-ended"}
                      </p>
                    </div>
                    {m.revoked && m.revokedAt && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Revoked</p>
                        <p className="font-medium mt-0.5">{new Date(m.revokedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {active && isProducer && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-none h-9 px-4 gap-2 shrink-0"
                    onClick={() => revokeMandate.mutate({ mandateId: m.id })}
                    disabled={revokeMandate.isPending}
                  >
                    <ShieldX className="w-3.5 h-3.5" /> Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
