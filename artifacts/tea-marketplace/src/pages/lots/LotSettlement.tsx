import { useParams, Link } from "wouter";
import { useGetTeaLotSettlement, useGetTeaLot, useConfirmTeaLotPayment, getGetTeaLotSettlementQueryKey, getGetTeaLotQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, FileCheck2, ArrowLeft } from "lucide-react";

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
        toast({ title: "Payment confirmed" });
        queryClient.invalidateQueries({ queryKey: getGetTeaLotSettlementQueryKey(lotId) });
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={`/lots/${lotId}`} className="text-primary hover:underline text-sm font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Lot
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Settlement Statement</h1>
        <p className="text-muted-foreground">Financial breakdown for Lot #{lotId} {lot ? `(${lot.grade})` : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-none shadow-none border-border">
          <CardHeader className="bg-muted/10 border-b p-4">
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Status</span>
              <Badge variant={settlement.paymentStatus === 'PAID' ? 'default' : 'secondary'} className="rounded-none">
                {settlement.paymentStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${settlement.paymentStatus === 'PAID' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {settlement.paymentStatus === 'PAID' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-semibold text-lg">Buyer Payment</div>
                <div className="text-sm text-muted-foreground">
                  {settlement.paymentStatus === 'PAID' ? 'Funds secured' : 'Awaiting funds'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${settlement.deliveryOrderStatus === 'ISSUED' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-lg">Delivery Order</div>
                <div className="text-sm text-muted-foreground">
                  Status: <span className="uppercase font-mono">{settlement.deliveryOrderStatus}</span>
                </div>
              </div>
            </div>

            {settlement.paymentStatus === 'PENDING' && (
              <div className="pt-4 border-t">
                <Button 
                  className="w-full rounded-none" 
                  onClick={() => confirmPayment.mutate({ lotId })}
                  disabled={confirmPayment.isPending}
                >
                  Admin: Confirm Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none shadow-none border-border">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-4">
            <CardTitle className="text-lg">Financial Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="p-4 flex justify-between items-center bg-card">
                <span className="font-medium text-muted-foreground">Gross Amount</span>
                <span className="text-xl font-mono">${settlement.grossAmountUsd.toFixed(2)}</span>
              </div>
              <div className="p-4 flex justify-between items-center bg-muted/5">
                <span className="font-medium text-muted-foreground">Platform Fee</span>
                <span className="text-lg font-mono text-destructive">-${settlement.platformFeeUsd.toFixed(2)}</span>
              </div>
              <div className="p-4 flex justify-between items-center bg-muted/5">
                <span className="font-medium text-muted-foreground">Broker Commission</span>
                <span className="text-lg font-mono text-destructive">-${settlement.brokerCommissionUsd.toFixed(2)}</span>
              </div>
              <div className="p-6 flex justify-between items-center bg-primary text-primary-foreground">
                <span className="font-bold text-lg uppercase tracking-wider">Net Producer</span>
                <span className="text-3xl font-black font-mono">${settlement.netProducerAmountUsd.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-4 bg-muted/20 text-center text-sm text-muted-foreground">
              Prompt Date: <strong className="text-foreground">{new Date(settlement.promptDate).toLocaleDateString()}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}