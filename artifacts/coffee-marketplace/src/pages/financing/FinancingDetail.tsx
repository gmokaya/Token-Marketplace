import {
  useGetFinancingRequest,
  useGetMe,
  useApproveFinancing,
  useRejectFinancing,
  useDisburseFinancing,
  getListFinancingRequestsQueryKey,
  getGetFinancingRequestQueryKey,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, XCircle, Landmark, Package, Loader2, Banknote } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-slate-100 text-slate-800 border-slate-200",
  APPROVED:  "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED:  "bg-red-100 text-red-800 border-red-200",
  DISBURSED: "bg-green-100 text-green-800 border-green-200",
  REPAID:    "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function FinancingDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const id = parseInt(requestId ?? "", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: req, isLoading } = useGetFinancingRequest(id, {
    query: { enabled: !isNaN(id), queryKey: getGetFinancingRequestQueryKey(id) },
  });
  const approve  = useApproveFinancing();
  const reject   = useRejectFinancing();
  const disburse = useDisburseFinancing();

  const isFinancier  = me?.tier === "FINANCIER";
  const canApprove   = isFinancier && req?.status === "PENDING";
  const canDisburse  = isFinancier && req?.status === "APPROVED";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListFinancingRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFinancingRequestQueryKey(id) });
  };

  const handleApprove = () => {
    approve.mutate(
      { requestId: id },
      {
        onSuccess: () => {
          toast({
            title: "Request approved",
            description: "Financing approved. You can now disburse the funds.",
          });
          invalidate();
        },
        onError: (err: any) => {
          toast({ title: "Failed to approve", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const handleReject = () => {
    reject.mutate(
      { requestId: id },
      {
        onSuccess: () => {
          toast({ title: "Request rejected", description: "The financing request has been declined." });
          invalidate();
          setLocation("/financing");
        },
        onError: (err: any) => {
          toast({ title: "Failed to reject", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const handleDisburse = () => {
    disburse.mutate(
      { requestId: id },
      {
        onSuccess: () => {
          toast({
            title: "Funds disbursed",
            description: `$${req?.lMaxUsd?.toLocaleString(undefined, { maximumFractionDigits: 2 })} has been disbursed to the requester.`,
          });
          invalidate();
        },
        onError: (err: any) => {
          toast({ title: "Disbursement failed", description: err?.error ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (isNaN(id)) {
    return <div className="text-center py-12 text-muted-foreground">Invalid request ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Financing request not found.</p>
        <Link href="/financing">
          <Button variant="link" className="mt-2">Back to Financing</Button>
        </Link>
      </div>
    );
  }

  const ltv = req.marketValueUsd > 0 ? (req.lMaxUsd / req.marketValueUsd) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/financing">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Request #{req.id}</h1>
            <Badge variant="outline" className={STATUS_COLORS[req.status] ?? STATUS_COLORS.PENDING}>
              {req.status}
            </Badge>
          </div>
          {req.requesterName && (
            <p className="text-sm text-muted-foreground mt-0.5">{req.requesterName}</p>
          )}
        </div>
      </div>

      {/* Collateral */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Collateral
          </CardTitle>
          <CardDescription>Warehouse receipt backing this financing request</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailRow label="eWR ID" value={<span className="font-mono">#{req.ewrId}</span>} />
          {req.commodityType && <DetailRow label="Commodity" value={req.commodityType} />}
          {req.grade && <DetailRow label="Grade" value={req.grade} />}
          {req.weightMt != null && <DetailRow label="Weight" value={`${req.weightMt} MT`} />}
          {req.warehouseCode && <DetailRow label="Warehouse" value={req.warehouseCode} />}
        </CardContent>
      </Card>

      {/* Loan Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Loan Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Market Value (V_market)"
            value={<span className="font-mono">${req.marketValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
          />
          <DetailRow
            label="Max Loan (L_max · 70% LTV)"
            value={<span className="font-mono font-bold">${req.lMaxUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
          />
          <DetailRow label="Effective LTV" value={`${ltv.toFixed(1)}%`} />
          <DetailRow label="Interest Rate" value={`${(req.interestRate * 100).toFixed(2)}% p.a.`} />
          {req.approvedAt && (
            <DetailRow label="Approved At" value={format(new Date(req.approvedAt), "MMM d, yyyy HH:mm")} />
          )}
          {req.lenderName && <DetailRow label="Lender" value={req.lenderName} />}
        </CardContent>
      </Card>

      {/* Step 1 — Review: PENDING → APPROVED or REJECTED */}
      {canApprove && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review Decision</CardTitle>
            <CardDescription>
              Approve this request to move it to APPROVED, then disburse funds as a separate step. Or reject to decline.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              className="flex-1 gap-2"
              onClick={handleApprove}
              disabled={approve.isPending || reject.isPending}
            >
              {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleReject}
              disabled={approve.isPending || reject.isPending}
            >
              {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Disburse: APPROVED → DISBURSED */}
      {canDisburse && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Disburse Funds
            </CardTitle>
            <CardDescription>
              This request is approved. Release the loan amount to the requester to complete the financing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Amount to disburse</span>
              <span className="font-mono font-bold text-blue-900">
                ${req.lMaxUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleDisburse}
              disabled={disburse.isPending}
            >
              {disburse.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              Disburse Funds
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Disbursed confirmation */}
      {req.status === "DISBURSED" && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Loan Disbursed</p>
              <p className="text-xs text-green-700 mt-0.5">
                ${req.lMaxUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} has been disbursed to the requester's account.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
