import { useGetForwardContract, useCoSignForwardContract, useCompleteForwardContract, useGetMe, getListForwardContractsQueryKey, getGetForwardContractQueryKey, ForwardContractContractStatus } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock, Pen, Package, Loader2, Users } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT:             "bg-zinc-100 text-zinc-600 border-zinc-200",
  PENDING_SIGNATURE: "bg-slate-100 text-slate-800 border-slate-200",
  ACTIVE:            "bg-blue-100 text-blue-800 border-blue-200",
  MATURED:           "bg-green-100 text-green-800 border-green-200",
  DEFAULTED:         "bg-red-100 text-red-800 border-red-200",
  CANCELLED:         "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const BOND_STATUS_COLORS: Record<string, string> = {
  NOT_POSTED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  POSTED:     "bg-green-100 text-green-800 border-green-200",
  FORFEITED:  "bg-red-100 text-red-800 border-red-200",
  RELEASED:   "bg-slate-100 text-slate-600 border-slate-200",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function BondBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${BOND_STATUS_COLORS[status] ?? BOND_STATUS_COLORS.NOT_POSTED}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function ForwardDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const id = parseInt(contractId ?? "", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: contract, isLoading } = useGetForwardContract(id, {
    query: { enabled: !isNaN(id), queryKey: getGetForwardContractQueryKey(id) },
  });
  const coSign   = useCoSignForwardContract();
  const complete = useCompleteForwardContract();

  if (isNaN(id)) {
    return <div className="text-center py-12 text-muted-foreground">Invalid contract ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Contract not found.</p>
        <Link href="/forwards">
          <Button variant="link" className="mt-2">Back to Forwards</Button>
        </Link>
      </div>
    );
  }

  const isBuyer     = me?.id === contract.buyerId;
  const isParty     = me?.id === contract.sellerId || isBuyer || me?.tier === "ENABLER";
  const maturityPast = new Date(contract.maturityDate) <= new Date();
  // Pending contracts have no buyer yet — any OFF_TAKER who is not the seller can co-sign
  const canCoSign   =
    me?.tier === "OFF_TAKER" &&
    me?.id !== contract.sellerId &&
    contract.contractStatus === ForwardContractContractStatus.PENDING_SIGNATURE;
  // Complete is allowed only when ACTIVE and the maturity date has already passed
  const canComplete = isParty &&
    contract.contractStatus === ForwardContractContractStatus.ACTIVE &&
    maturityPast;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListForwardContractsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetForwardContractQueryKey(id) });
  };

  const handleCoSign = () => {
    coSign.mutate(
      { contractId: id },
      {
        onSuccess: () => {
          toast({ title: "Contract co-signed", description: "You have signed the forward contract. It is now active." });
          invalidateAll();
        },
        onError: (err: any) => {
          toast({ title: "Failed to co-sign", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const handleComplete = () => {
    complete.mutate(
      { contractId: id },
      {
        onSuccess: () => {
          toast({ title: "Contract settled", description: "The forward contract has been completed." });
          invalidateAll();
        },
        onError: (err: any) => {
          toast({ title: "Failed to settle", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/forwards">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Contract #{contract.id}</h1>
            <Badge variant="outline" className={CONTRACT_STATUS_COLORS[contract.contractStatus] ?? CONTRACT_STATUS_COLORS.DRAFT}>
              {contract.contractStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          {contract.signedAt && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Signed {format(new Date(contract.signedAt), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Parties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Parties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Seller"
            value={contract.sellerName ?? `User #${contract.sellerId}`}
          />
          <DetailRow
            label="Buyer"
            value={contract.buyerName ?? (contract.buyerId ? `User #${contract.buyerId}` : "—")}
          />
        </CardContent>
      </Card>

      {/* Contract Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Contract Terms
          </CardTitle>
          <CardDescription>Agreed terms for future delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailRow label="eWR" value={<span className="font-mono">#{contract.ewrId}</span>} />
          {contract.commodityType && <DetailRow label="Commodity" value={contract.commodityType} />}
          {contract.grade && <DetailRow label="Grade" value={contract.grade} />}
          {contract.weightMt != null && <DetailRow label="Volume" value={`${contract.weightMt} MT`} />}
          {contract.warehouseCode && <DetailRow label="Warehouse" value={contract.warehouseCode} />}
          <DetailRow
            label="Delivery Price"
            value={<span className="font-mono font-bold">${contract.deliveryPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
          />
          <DetailRow
            label="Maturity Date"
            value={<span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(contract.maturityDate), "MMM d, yyyy")}</span>}
          />
        </CardContent>
      </Card>

      {/* Performance Bonds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Bonds</CardTitle>
          <CardDescription>
            15% of contract value · ${contract.performanceBondUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} each
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Seller Bond"
            value={<BondBadge status={contract.sellerBondStatus} />}
          />
          <DetailRow
            label="Buyer Bond"
            value={<BondBadge status={contract.buyerBondStatus} />}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {canCoSign && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Awaiting Your Signature</CardTitle>
            <CardDescription>
              Review the terms above and co-sign to activate this forward contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={handleCoSign} disabled={coSign.isPending}>
              {coSign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pen className="w-4 h-4" />}
              Co-sign Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active contract past maturity — can be completed */}
      {canComplete && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Maturity Date Reached</CardTitle>
            <CardDescription>
              The delivery date has passed. Confirm delivery readiness to release both performance bonds and hand the contract to the settlement engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2" onClick={handleComplete} disabled={complete.isPending}>
              {complete.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Delivery Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active contract not yet at maturity — show countdown */}
      {contract.contractStatus === ForwardContractContractStatus.ACTIVE && !maturityPast && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-5 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Contract Active</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Awaiting maturity on {format(new Date(contract.maturityDate), "MMMM d, yyyy")}. Both bonds are posted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MATURED — bonds released, settlement engine takes over */}
      {contract.contractStatus === ForwardContractContractStatus.MATURED && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Matured — Pending Settlement</p>
              <p className="text-xs text-green-700 mt-0.5">
                Both performance bonds have been released. The settlement engine will finalise title transfer and disburse proceeds.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
