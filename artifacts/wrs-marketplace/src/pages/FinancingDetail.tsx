import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetFinancingRequest,
  useApproveFinancing,
  useRejectFinancing,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Landmark, BanknoteIcon, Clock } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  DISBURSED: "bg-green-100 text-green-800 border-green-200",
  REPAID: "bg-gray-100 text-gray-800 border-gray-200",
};

const LIEN_STYLES: Record<string, string> = {
  ACTIVE: "bg-orange-100 text-orange-800 border-orange-200",
  REPAID: "bg-green-100 text-green-800 border-green-200",
  DEFAULTED: "bg-red-100 text-red-800 border-red-200",
};

export default function FinancingDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const id = parseInt(requestId ?? "0");
  const { data: req, isLoading, refetch } = useGetFinancingRequest(id, {
    query: { refetchInterval: 8000 } as any,
  });
  const { data: me } = useGetMe();

  const { mutateAsync: approve, isPending: approving } = useApproveFinancing();
  const { mutateAsync: reject, isPending: rejecting } = useRejectFinancing();

  const isFinancier = me?.tier === "FINANCIER";

  async function handleApprove() {
    try {
      await approve({ requestId: id });
      toast({ title: "Financing approved", description: "The eWR has been encumbered and a loan record created." });
      refetch();
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleReject() {
    try {
      await reject({ requestId: id });
      toast({ title: "Financing rejected", description: "The request has been declined." });
      refetch();
    } catch (err: any) {
      toast({ title: "Rejection failed", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return <Layout><div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></Layout>;
  }

  if (!req) {
    return <Layout><div className="text-center py-16 text-muted-foreground">Financing request not found.</div></Layout>;
  }

  const loan = (req as any).loan;
  const daysElapsed = loan ? Math.floor((Date.now() - new Date(loan.startDate).getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const accruedInterest = loan ? (Number(loan.principalUsd) * Number(loan.interestRate) * daysElapsed / 365) : 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/financing")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financing Request FR-{String(req.id).padStart(4, "0")}</h1>
            <p className="text-muted-foreground text-sm">Inventory Receipt Discounting</p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full border font-medium ${STATUS_STYLES[req.status] ?? ""}`}>{req.status}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" /> Advance Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">eWR Value</span><span className="font-medium">${Number(req.marketValueUsd).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max Advance (60%)</span><span className="font-bold text-green-700">${Number(req.lMaxUsd).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span>{(Number(req.interestRate) * 100).toFixed(1)}% p.a.</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Requester</span><span>{req.requesterName ?? "—"}</span></div>
              {req.lenderName && <div className="flex justify-between"><span className="text-muted-foreground">Lender</span><span>{req.lenderName}</span></div>}
              {req.approvedAt && <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span>{new Date(req.approvedAt).toLocaleDateString()}</span></div>}
              {req.disbursedAt && <div className="flex justify-between"><span className="text-muted-foreground">Disbursed</span><span>{new Date(req.disbursedAt).toLocaleDateString()}</span></div>}
              {req.notes && <div className="pt-1"><p className="text-muted-foreground text-xs">Note: {req.notes}</p></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">📦 Collateral eWR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Receipt ID</span><span className="font-mono text-xs">ID #{req.ewrId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Commodity</span><span>{req.commodityType ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Grade</span><span>{req.grade ?? "—"}</span></div>
              {req.weightMt && <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span>{Number(req.weightMt).toFixed(3)} MT</span></div>}
              {req.warehouseCode && <div className="flex justify-between"><span className="text-muted-foreground">Warehouse</span><span>{req.warehouseCode}</span></div>}
              {req.estimatedValueUsd && <div className="flex justify-between"><span className="text-muted-foreground">Est. Value</span><span>${Number(req.estimatedValueUsd).toLocaleString()}</span></div>}
            </CardContent>
          </Card>
        </div>

        {loan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BanknoteIcon className="w-4 h-4" /> Active Loan
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LIEN_STYLES[loan.lienStatus] ?? ""}`}>{loan.lienStatus}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Principal</p>
                <p className="font-bold">${Number(loan.principalUsd).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Accrued Interest ({daysElapsed}d)</p>
                <p className="font-bold text-orange-600">+${accruedInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Repayable</p>
                <p className="font-bold">${(Number(loan.principalUsd) + accruedInterest).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Start Date</p>
                <p className="font-medium">{new Date(loan.startDate).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isFinancier && req.status === "PENDING" && (
          <Card>
            <CardContent className="p-4 flex gap-3 items-center">
              <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm flex-1">This request is awaiting your decision. Review the collateral and terms above before approving.</p>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleReject} disabled={rejecting || approving}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={handleApprove} disabled={approving || rejecting}>
                  <CheckCircle className="w-4 h-4 mr-1" /> {approving ? "Approving…" : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
