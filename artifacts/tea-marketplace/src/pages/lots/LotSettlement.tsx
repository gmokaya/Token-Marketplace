import { useParams, Link } from "wouter";
import { useGetTeaLotSettlement, useGetTeaLot, useConfirmTeaLotPayment, getGetTeaLotSettlementQueryKey, getGetTeaLotQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, FileCheck2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function LotSettlement() {
  const params = useParams();
  const lotId = Number(params.lotId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lot, isError: lotError } = useGetTeaLot(lotId, { query: { enabled: !!lotId, queryKey: getGetTeaLotQueryKey(lotId) } });
  const { data: settlement, isLoading, isError: settlementError } = useGetTeaLotSettlement(lotId, {
    query: { enabled: !!lotId, queryKey: getGetTeaLotSettlementQueryKey(lotId) }
  });

  const confirmPayment = useConfirmTeaLotPayment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payment confirmed", description: "The lot has been marked as settled." });
        queryClient.invalidateQueries({ queryKey: getGetTeaLotSettlementQueryKey(lotId) });
        queryClient.invalidateQueries({ queryKey: getGetTeaLotQueryKey(lotId) });
        queryClient.invalidateQueries({ queryKey: ["/api/tea/lots"] });
      }
    }
  });

  if (isLoading) return <Skeleton className="h-[600px] w-full max-w-4xl mx-auto" />;
  if (settlementError || !settlement) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <span>Settlement not found or not yet generated.</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link href={`/lots/${lotId}`} className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold uppercase tracking-wider flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Lot
      </Link>
      <PageHeader
        title="Settlement Statement"
        description={`Financial breakdown for Lot #${lotId} ${lot ? `(${lot.grade})` : ''}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-none shadow-sm border border-border">
          <CardHeader className="bg-muted/5 border-b border-border p-5">
            <CardTitle className="text-lg font-bold flex justify-between items-center">
              <span>Status Overview</span>
              <Badge variant={settlement.paymentStatus === 'PAID' ? 'default' : 'secondary'} className="rounded-none px-3 py-1 tracking-wider text-xs">
                {settlement.paymentStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 border ${settlement.paymentStatus === 'PAID' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/10 border-border text-muted-foreground'}`}>
                {settlement.paymentStatus === 'PAID' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-bold text-lg">Buyer Payment</div>
                <div className="text-sm text-muted-foreground font-medium mt-1">
                  {settlement.paymentStatus === 'PAID' ? 'Funds successfully secured' : 'Awaiting incoming funds'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`p-4 border ${settlement.deliveryOrderStatus === 'ISSUED' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/10 border-border text-muted-foreground'}`}>
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-lg">Delivery Order</div>
                <div className="text-sm text-muted-foreground font-medium mt-1">
                  Status: <span className="uppercase font-mono text-foreground font-semibold ml-1">{settlement.deliveryOrderStatus}</span>
                </div>
              </div>
            </div>

            {settlement.paymentStatus === 'PENDING' && (
              <div className="pt-6 mt-2 border-t border-border">
                <Button 
                  className="w-full rounded-none h-12 font-semibold" 
                  onClick={() => confirmPayment.mutate({ lotId })}
                  disabled={confirmPayment.isPending}
                >
                  Admin: Confirm Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none shadow-sm border border-border">
          <CardHeader className="bg-primary text-primary-foreground border-b border-primary/10 p-5">
            <CardTitle className="text-lg font-bold">Financial Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="p-5 flex justify-between items-center bg-card">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-sm">Gross Amount</span>
                <span className="text-xl font-mono font-bold">${settlement.grossAmountUsd.toFixed(2)}</span>
              </div>
              <div className="p-5 flex justify-between items-center bg-muted/5">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-sm">Platform Fee</span>
                <span className="text-lg font-mono text-destructive font-medium">-${settlement.platformFeeUsd.toFixed(2)}</span>
              </div>
              <div className="p-5 flex justify-between items-center bg-muted/5">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-sm">Broker Commission</span>
                <span className="text-lg font-mono text-destructive font-medium">-${settlement.brokerCommissionUsd.toFixed(2)}</span>
              </div>
              <div className="p-6 flex justify-between items-center bg-card border-t-2 border-border">
                <span className="font-bold text-lg uppercase tracking-widest text-primary">Net Producer</span>
                <span className="text-4xl font-black font-mono tracking-tight">${settlement.netProducerAmountUsd.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-5 bg-muted/10 border-t border-border text-center text-sm text-muted-foreground font-medium">
              Prompt Date: <strong className="text-foreground font-mono ml-2">{new Date(settlement.promptDate).toLocaleDateString()}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}