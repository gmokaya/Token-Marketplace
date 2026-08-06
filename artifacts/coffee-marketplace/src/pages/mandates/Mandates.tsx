import { useState } from "react";
import { useGetMandatesGiven, useRevokeBrokerMandate, useCreateBrokerMandate, getGetMandatesGivenQueryKey } from "@workspace/api-client-react";
import { BrokerMandate } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ShieldCheck, Plus, CalendarClock, User, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function MandateRow({ mandate, onRevoke, revoking }: {
  mandate: BrokerMandate;
  onRevoke: (id: number) => void;
  revoking: boolean;
}) {
  const isActive = !mandate.revoked && (!mandate.validTo || new Date(mandate.validTo) > new Date());

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{mandate.brokerName ?? `Broker #${mandate.brokerId}`}</span>
            <Badge
              variant="outline"
              className={`text-xs ${isActive
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}
            >
              {mandate.revoked ? "Revoked" : isActive ? "Active" : "Expired"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">{mandate.commodityType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Granted {format(new Date(mandate.createdAt), "MMM d, yyyy")}
            {mandate.validTo && ` · expires ${format(new Date(mandate.validTo), "MMM d, yyyy")}`}
          </p>
        </div>
      </div>
      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => onRevoke(mandate.id)}
          disabled={revoking}
        >
          {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Revoke
        </Button>
      )}
    </div>
  );
}

function GrantMandateDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [brokerId, setBrokerId] = useState("");
  const { toast } = useToast();
  const createMandate = useCreateBrokerMandate();

  const handleGrant = () => {
    const id = parseInt(brokerId);
    if (!id || isNaN(id)) {
      toast({ title: "Invalid broker ID", variant: "destructive" });
      return;
    }
    createMandate.mutate(
      { data: { brokerId: id, commodityType: "COFFEE", permissions: ["list", "accept_bids", "negotiate", "set_reserve"] } },
      {
        onSuccess: () => {
          toast({ title: "Mandate granted", description: "The broker can now trade COFFEE lots on your behalf." });
          setOpen(false);
          setBrokerId("");
          onSuccess();
        },
        onError: (err: any) => {
          toast({ title: "Failed to grant mandate", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Grant Mandate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant Broker Mandate</DialogTitle>
          <DialogDescription>
            Authorise a certified broker to list your COFFEE lots in auctions on your behalf.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Broker Platform ID</Label>
            <Input
              type="number"
              placeholder="Enter broker user ID"
              value={brokerId}
              onChange={e => setBrokerId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ask your broker for their CoffeeXchange platform user ID.
            </p>
          </div>
          <Button onClick={handleGrant} className="w-full" disabled={createMandate.isPending}>
            {createMandate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Grant Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Mandates() {
  const { data: mandates, isLoading } = useGetMandatesGiven();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const revoke = useRevokeBrokerMandate();
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const handleRevoke = (id: number) => {
    setRevokingId(id);
    revoke.mutate(
      { mandateId: id },
      {
        onSuccess: () => {
          toast({ title: "Mandate revoked", description: "The broker can no longer trade on your behalf." });
          queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed to revoke mandate", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
        onSettled: () => setRevokingId(null),
      }
    );
  };

  const active  = (mandates ?? []).filter(m => !m.revoked && (!m.validTo || new Date(m.validTo) > new Date()));
  const expired = (mandates ?? []).filter(m => m.revoked || (m.validTo && new Date(m.validTo) <= new Date()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broker Mandates</h1>
          <p className="text-muted-foreground mt-1">Authorise certified brokers to trade your lots.</p>
        </div>
        <GrantMandateDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetMandatesGivenQueryKey() })} />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : (mandates ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border rounded-xl border-dashed border-border bg-card/50 gap-3">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No mandates granted</p>
            <p className="text-sm mt-0.5">Grant a mandate to allow a broker to list your lots in auctions.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Mandates</CardTitle>
                <CardDescription>{active.length} broker{active.length !== 1 ? "s" : ""} authorised</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {active.map(m => (
                  <MandateRow key={m.id} mandate={m} onRevoke={handleRevoke} revoking={revokingId === m.id} />
                ))}
              </CardContent>
            </Card>
          )}
          {expired.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expired / Revoked</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {expired.map(m => (
                  <MandateRow key={m.id} mandate={m} onRevoke={handleRevoke} revoking={revokingId === m.id} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
