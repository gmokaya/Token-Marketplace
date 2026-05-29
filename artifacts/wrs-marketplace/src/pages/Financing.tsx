import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useListFinancingRequests,
  useListEligibleEwrs,
  useGetLoanBook,
  useRequestFinancing,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, BanknoteIcon } from "lucide-react";

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

function StatusIcon({ status }: { status: string }) {
  if (status === "PENDING") return <Clock className="w-4 h-4 text-yellow-600" />;
  if (status === "APPROVED" || status === "DISBURSED") return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status === "REJECTED") return <XCircle className="w-4 h-4 text-red-600" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
}

function RequestAdvanceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedEwrId, setSelectedEwrId] = useState<number | null>(null);
  const { data: eligible, isLoading } = useListEligibleEwrs({ query: { enabled: open } as any });
  const { mutateAsync, isPending } = useRequestFinancing();
  const { toast } = useToast();

  const selectedEwr = eligible?.find(e => e.id === selectedEwrId);

  async function handleSubmit() {
    if (!selectedEwrId) return;
    try {
      await mutateAsync({ data: { ewrId: selectedEwrId } });
      toast({ title: "Financing request submitted", description: "Your advance request is pending review by a financier." });
      setOpen(false);
      setSelectedEwrId(null);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Landmark className="w-4 h-4" /> Request Advance</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Cash Advance</DialogTitle>
          <DialogDescription>
            Select an eligible eWR to advance up to 60% of its estimated value at 12% annual interest.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {isLoading && <Skeleton className="h-40" />}
          {!isLoading && !eligible?.length && (
            <p className="text-sm text-muted-foreground">No eligible eWRs. Only INGESTED eWRs without an active lien qualify.</p>
          )}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {eligible?.map(ewr => (
              <button
                key={ewr.id}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${
                  selectedEwrId === ewr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedEwrId(ewr.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-sm">{ewr.ewrsReceiptId}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ewr.commodityType} · {ewr.grade} · {Number(ewr.weightMt).toFixed(1)} MT · {ewr.warehouseCode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-700">${Number(ewr.lMaxUsd).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">max advance</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {selectedEwr && (
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">eWR Value</span><span>${Number(selectedEwr.estimatedValueUsd).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max Advance (60%)</span><span className="font-semibold text-green-700">${Number(selectedEwr.lMaxUsd).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Annual Rate</span><span>{((selectedEwr.annualInterestRate ?? 0.12) * 100).toFixed(1)}%</span></div>
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={!selectedEwrId || isPending}>
            {isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Financing() {
  const { data: me } = useGetMe();
  const [refetchKey, setRefetchKey] = useState(0);

  const isFinancier = me?.tier === "FINANCIER" || me?.tier === "ENABLER";
  const isProducer = me?.tier === "PRODUCER";

  const { data: requests, isLoading: reqLoading } = useListFinancingRequests(
    {},
    { query: { refetchInterval: 10000 } as any }
  );
  const { data: loanBook, isLoading: loanLoading } = useGetLoanBook({
    query: { enabled: isFinancier } as any,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financing</h1>
            <p className="text-muted-foreground mt-1">Inventory receipt discounting — advance up to 60% of eWR value</p>
          </div>
          {isProducer && <RequestAdvanceDialog onSuccess={() => setRefetchKey(k => k + 1)} />}
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            {isFinancier && <TabsTrigger value="loanbook">Loan Book</TabsTrigger>}
          </TabsList>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {reqLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            {!reqLoading && !requests?.length && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  {isProducer ? "No financing requests yet. Click Request Advance to get started." : "No financing requests in the system."}
                </CardContent>
              </Card>
            )}
            {requests?.map(req => (
              <Link key={req.id} href={`/financing/${req.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <StatusIcon status={req.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">FR-{String(req.id).padStart(4, "0")}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[req.status] ?? ""}`}>{req.status}</span>
                        {req.commodityType && <span className="text-xs text-muted-foreground">{req.commodityType} · {req.grade}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                        {req.requesterName && <span>Requester: {req.requesterName}</span>}
                        {req.lenderName && <span>Lender: {req.lenderName}</span>}
                        {req.warehouseCode && <span>{req.warehouseCode}</span>}
                        {req.weightMt && <span>{Number(req.weightMt).toFixed(1)} MT</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-green-700">${Number(req.lMaxUsd).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">advance limit</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          {isFinancier && (
            <TabsContent value="loanbook" className="mt-4 space-y-3">
              {loanLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              {!loanLoading && !loanBook?.length && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <BanknoteIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No active loans in the loan book.
                  </CardContent>
                </Card>
              )}
              {loanBook?.map(loan => (
                <Card key={loan.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">Loan #{loan.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LIEN_STYLES[loan.lienStatus ?? "ACTIVE"] ?? ""}`}>{loan.lienStatus}</span>
                          {loan.commodityType && <span className="text-xs text-muted-foreground">{loan.commodityType} · {loan.grade}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                          {loan.requesterName && <span>Borrower: {loan.requesterName}</span>}
                          {loan.warehouseCode && <span>{loan.warehouseCode}</span>}
                          <span>{loan.daysElapsed}d elapsed</span>
                          <span>Rate: {(Number(loan.interestRate) * 100).toFixed(1)}% p.a.</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="font-bold">${Number(loan.principalUsd).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">principal</div>
                        <div className="text-sm font-semibold text-orange-600">+${Number(loan.accruedInterestUsd).toLocaleString()} interest</div>
                        <div className="text-xs text-muted-foreground">Total: ${Number(loan.totalRepayableUsd).toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
