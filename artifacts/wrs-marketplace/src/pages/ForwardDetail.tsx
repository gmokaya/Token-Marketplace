import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetForwardContract,
  useCoSignForwardContract,
  useResolveDefault,
  useCompleteForwardContract,
  useInitiateSettlement,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileSignature, AlertTriangle, CheckCircle2, Banknote } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  PENDING_SIGNATURE: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  MATURED: "bg-blue-100 text-blue-800 border-blue-200",
  DEFAULTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
  SETTLED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const BOND_COLORS: Record<string, string> = {
  PENDING_BOND: "text-amber-600 bg-amber-50 border-amber-200",
  ACTIVE: "text-green-700 bg-green-50 border-green-200",
  FORFEITED: "text-red-700 bg-red-50 border-red-200",
  RELEASED: "text-gray-500 bg-gray-50 border-gray-200",
  LOCKED: "text-amber-600 bg-amber-50 border-amber-200",
};

export default function ForwardDetail() {
  const [, params] = useRoute("/forwards/:contractId");
  const [, navigate] = useLocation();
  const contractId = parseInt(params?.contractId ?? "");
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const [defaultSide, setDefaultSide] = useState<"BUYER" | "SELLER">("BUYER");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contract, isLoading, refetch } = useGetForwardContract(contractId, {
    query: { refetchInterval: 15000 } as any,
  });

  const { mutateAsync: coSign, isPending: isSigning } = useCoSignForwardContract();
  const { mutateAsync: resolveDefault, isPending: isResolving } = useResolveDefault();
  const { mutateAsync: complete, isPending: isCompleting } = useCompleteForwardContract();
  const { mutateAsync: initiateSettlement, isPending: isSettling } = useInitiateSettlement();

  const isOffTaker = me?.tier === "OFF_TAKER";
  const isSeller = contract?.sellerId === me?.id;
  const isBuyer = contract?.buyerId === me?.id;
  const isEnabler = me?.tier === "ENABLER";
  const isParty = isSeller || isBuyer || isEnabler;

  const handleCoSign = async () => {
    try {
      await coSign({ contractId });
      toast({ title: "Contract signed!", description: "You are now the buyer. Both performance bonds are active." });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to co-sign";
      toast({ title: "Co-sign failed", description: msg, variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    try {
      await complete({ contractId });
      toast({ title: "Contract completed!", description: "Both bonds released. Initiate settlement to disburse funds." });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to complete contract";
      toast({ title: "Completion failed", description: msg, variant: "destructive" });
    }
  };

  const handleResolveDefault = async () => {
    try {
      await resolveDefault({ contractId, data: { defaultSide } });
      const desc = defaultSide === "BUYER"
        ? "Buyer bond forfeited to seller."
        : "Seller bond forfeited to buyer.";
      toast({ title: "Default resolved", description: desc });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to resolve default";
      toast({ title: "Resolution failed", description: msg, variant: "destructive" });
    }
  };

  const handleInitiateSettlement = async () => {
    try {
      const settlement = await initiateSettlement({ data: { entityType: "FORWARD", entityId: contractId } });
      toast({ title: "Settlement initiated", description: "Proceed to disburse each leg." });
      navigate(`/settlements/${settlement.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to initiate settlement";
      toast({ title: "Settlement failed", description: msg, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-80" />
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Contract not found.</p>
          <Button asChild variant="link" className="mt-2"><Link href="/forwards">← Back to Forwards</Link></Button>
        </div>
      </Layout>
    );
  }

  const isMatured = new Date(contract.maturityDate) <= new Date();

  const canCoSign = isOffTaker &&
    contract.contractStatus === "PENDING_SIGNATURE" &&
    contract.sellerId !== me?.id;

  const canComplete = isParty &&
    contract.contractStatus === "ACTIVE" &&
    isMatured;

  const canResolveDefault = isParty &&
    contract.contractStatus === "ACTIVE" &&
    isMatured;

  const canInitiateSettlement = isParty &&
    contract.contractStatus === "MATURED";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/forwards"><ArrowLeft className="w-4 h-4 mr-1" />Forwards</Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-sm">Contract #{contract.id}</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{contract.commodityType} · {contract.grade}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {contract.warehouseCode} · {contract.weightMt} MT
                </p>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[contract.contractStatus]}>
                {contract.contractStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-xs text-muted-foreground mb-1">Delivery Price</p>
                <p className="text-xl font-bold">${parseFloat(String(contract.deliveryPriceUsd)).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <p className="text-xs text-amber-700 mb-1">Performance Bond (15%)</p>
                <p className="text-xl font-bold text-amber-800">${parseFloat(String(contract.performanceBondUsd)).toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-xs text-muted-foreground mb-1">Maturity Date</p>
                <p className="font-bold text-sm">{new Date(contract.maturityDate).toLocaleDateString()}</p>
                {isMatured && <p className="text-xs text-red-600 font-medium mt-1">Past maturity</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parties</h3>
                <div className="flex justify-between items-center p-2 rounded border">
                  <span className="text-sm text-muted-foreground">Seller</span>
                  <span className="font-medium text-sm">{contract.sellerName ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded border">
                  <span className="text-sm text-muted-foreground">Buyer</span>
                  <span className="font-medium text-sm">{contract.buyerName ?? <span className="text-muted-foreground italic">Awaiting co-signer</span>}</span>
                </div>
                {contract.signedAt && (
                  <div className="flex justify-between items-center p-2 rounded border">
                    <span className="text-sm text-muted-foreground">Signed</span>
                    <span className="text-sm">{new Date(contract.signedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bond Status</h3>
                <div className={`flex justify-between items-center p-2 rounded border ${BOND_COLORS[contract.sellerBondStatus] ?? ""}`}>
                  <span className="text-sm font-medium">Seller Bond</span>
                  <span className="font-bold text-xs">{contract.sellerBondStatus.replace(/_/g, " ")}</span>
                </div>
                <div className={`flex justify-between items-center p-2 rounded border ${BOND_COLORS[contract.buyerBondStatus] ?? ""}`}>
                  <span className="text-sm font-medium">Buyer Bond</span>
                  <span className="font-bold text-xs">{contract.buyerBondStatus.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>

            {canCoSign && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-start gap-2">
                  <FileSignature className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Co-sign this forward contract</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By co-signing, you commit a performance bond of{" "}
                      <strong>${parseFloat(String(contract.performanceBondUsd)).toFixed(2)}</strong> (15% of delivery price).
                      The eWR will be encumbered until maturity.
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCoSign} disabled={isSigning}>
                  {isSigning ? "Signing…" : "Co-Sign Contract"}
                </Button>
              </div>
            )}

            {canComplete && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-green-800">Contract has reached maturity — mark as completed</p>
                    <p className="text-xs text-green-700 mt-1">
                      Both performance bonds (
                      <strong>${parseFloat(String(contract.performanceBondUsd)).toFixed(2)}</strong> each) will be released.
                      You can then initiate settlement to disburse the delivery price.
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-green-700 hover:bg-green-800 text-white" onClick={handleComplete} disabled={isCompleting}>
                  {isCompleting ? "Completing…" : "Complete Contract"}
                </Button>
              </div>
            )}

            {canResolveDefault && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-800">Resolve a default at maturity</p>
                    <p className="text-xs text-red-700 mt-1">
                      Select which party defaulted. Their bond (
                      <strong>${parseFloat(String(contract.performanceBondUsd)).toFixed(2)}</strong>) will be forfeited to the other party.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={defaultSide === "BUYER" ? "default" : "outline"}
                    className={defaultSide === "BUYER" ? "bg-red-700 hover:bg-red-800 text-white flex-1" : "flex-1"}
                    onClick={() => setDefaultSide("BUYER")}
                  >
                    Buyer Defaulted
                  </Button>
                  <Button
                    size="sm"
                    variant={defaultSide === "SELLER" ? "default" : "outline"}
                    className={defaultSide === "SELLER" ? "bg-red-700 hover:bg-red-800 text-white flex-1" : "flex-1"}
                    onClick={() => setDefaultSide("SELLER")}
                  >
                    Seller Defaulted
                  </Button>
                </div>
                <Button variant="destructive" className="w-full" onClick={handleResolveDefault} disabled={isResolving}>
                  {isResolving ? "Resolving…" : `Resolve ${defaultSide === "BUYER" ? "Buyer" : "Seller"} Default`}
                </Button>
              </div>
            )}

            {canInitiateSettlement && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-start gap-2">
                  <Banknote className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-blue-800">Contract completed — initiate settlement</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Disburse the delivery price of{" "}
                      <strong>${parseFloat(String(contract.deliveryPriceUsd)).toLocaleString()}</strong> through the split-settlement engine.
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white" onClick={handleInitiateSettlement} disabled={isSettling}>
                  {isSettling ? "Initiating…" : "Initiate Settlement"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
