import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMandatesGivenQueryKey,
  getGetMyMandatesQueryKey,
  useCreateBrokerMandate,
  useGetMandatesGiven,
  useGetMe,
  useGetMyMandates,
  useRevokeBrokerMandate,
} from "@workspace/api-client-react";
import { CalendarClock, Loader2, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Mandates() {
  const { data: me } = useGetMe();
  const isBroker = me?.tier === "ENABLER";
  const given = useGetMandatesGiven({ query: { queryKey: getGetMandatesGivenQueryKey(), enabled: !!me && !isBroker } });
  const received = useGetMyMandates({ query: { queryKey: getGetMyMandatesQueryKey(), enabled: !!me && isBroker } });
  const mandates = isBroker ? received.data ?? [] : given.data ?? [];
  const isLoading = given.isLoading || received.isLoading;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const revoke = useRevokeBrokerMandate();
  const [brokerId, setBrokerId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const create = useCreateBrokerMandate();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyMandatesQueryKey() });
  };

  const grant = () => {
    const id = Number(brokerId);
    if (!Number.isInteger(id) || id < 1) {
      toast({ title: "Enter a valid broker ID", variant: "destructive" });
      return;
    }
    create.mutate(
      { data: { brokerId: id, commodityType: "MAIZE", permissions: ["list", "accept_bids", "negotiate", "set_reserve"] } },
      {
        onSuccess: () => {
          setBrokerId("");
          setDialogOpen(false);
          refresh();
          toast({ title: "Mandate granted", description: "The broker can now trade MAIZE lots on your behalf." });
        },
        onError: (error: any) => toast({ title: "Could not grant mandate", description: error?.error ?? error?.message ?? "Please try again.", variant: "destructive" }),
      },
    );
  };

  const revokeMandate = (id: number) => {
    revoke.mutate({ mandateId: id }, {
      onSuccess: () => { refresh(); toast({ title: "Mandate revoked" }); },
      onError: (error: any) => toast({ title: "Could not revoke mandate", description: error?.error ?? error?.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isBroker ? "My Broker Mandates" : "Broker Mandates"}</h1>
          <p className="mt-1 text-muted-foreground">{isBroker ? "Producers who have authorised you to trade their grain." : "Authorise certified brokers to trade your grain lots."}</p>
        </div>
        {!isBroker && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Grant mandate</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Grant broker mandate</DialogTitle><DialogDescription>Enter the platform ID of an ENABLER-tier broker. The mandate applies to MAIZE trading.</DialogDescription></DialogHeader>
              <div className="space-y-3 pt-2"><Label htmlFor="broker-id">Broker platform ID</Label><Input id="broker-id" type="number" min="1" placeholder="e.g. 42" value={brokerId} onChange={(event) => setBrokerId(event.target.value)} /><Button className="w-full" onClick={grant} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Grant access</Button></div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {isLoading ? <Card><CardContent className="space-y-4 pt-6">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</CardContent></Card> : mandates.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 text-center"><ShieldCheck className="h-9 w-9 text-muted-foreground/40" /><p className="font-medium">{isBroker ? "No active mandates" : "No mandates granted"}</p><p className="text-sm text-muted-foreground">{isBroker ? "Producer authorisations will appear here." : "Grant a mandate when a broker is ready to represent your grain."}</p></div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">{isBroker ? "Authorised producers" : "Active and historical mandates"}</CardTitle><CardDescription>{mandates.length} mandate{mandates.length === 1 ? "" : "s"}</CardDescription></CardHeader>
          <CardContent className="divide-y">
            {mandates.map((mandate) => {
              const active = !mandate.revoked && (!mandate.validTo || new Date(mandate.validTo) > new Date());
              return <div key={mandate.id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><UserRound className="h-4 w-4 text-muted-foreground" /></div><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{isBroker ? mandate.ownerName ?? `Producer #${mandate.ownerId}` : mandate.brokerName ?? `Broker #${mandate.brokerId}`}</span><Badge variant="outline" className={active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{mandate.revoked ? "Revoked" : active ? "Active" : "Expired"}</Badge><Badge variant="secondary">{mandate.commodityType}</Badge></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3 w-3" /> Granted {new Date(mandate.createdAt).toLocaleDateString()}{mandate.validTo ? ` · expires ${new Date(mandate.validTo).toLocaleDateString()}` : ""}</p></div></div>
                {!isBroker && active && <Button variant="outline" size="sm" className="gap-1.5 self-start text-destructive sm:self-auto" onClick={() => revokeMandate(mandate.id)} disabled={revoke.isPending}><Trash2 className="h-3.5 w-3.5" /> Revoke</Button>}
              </div>;
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}