import { useParams, Link } from "wouter";
import { getGetOrderQueryKey, useGetOrder, useGetSettlement, useInitiateSettlement } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getApiErrorMessage(error: { data?: unknown; message?: string }, fallback: string) {
  const data = error.data;
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return error.message || fallback;
}

export default function LotSettlement() {
  const { lotId } = useParams<{ lotId: string }>(); // Actually orderId in this flow context
  const orderId = Number(lotId);
  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { queryKey: getGetOrderQueryKey(orderId), enabled: !!lotId },
  });
  
  const initiate = useInitiateSettlement();
  const { toast } = useToast();

  const handlePay = () => {
    // In a real flow, this would call a payment gateway then trigger settlement leg
    initiate.mutate(
      { data: { entityType: 'ORDER', entityId: Number(lotId) } as any },
      {
        onSuccess: () => {
          toast({ title: "Settlement Initiated", description: "Funds are securely held in escrow." });
        },
        onError: (err) => {
          toast({ title: "Error", description: getApiErrorMessage(err, "Failed to initiate settlement."), variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="max-w-2xl mx-auto space-y-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!order) {
    return <div className="text-center py-12">Order not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlement</h1>
          <p className="text-muted-foreground mt-1">Complete payment to finalize transfer of ownership.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order #{order.id}</CardTitle>
          <CardDescription>Status: <span className="font-bold text-foreground">{order.status}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commodity Value</span>
              <span>${(order.totalUsd - order.platformFeeUsd - order.escrowFeeUsd).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>${order.platformFeeUsd.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Escrow Fee</span>
              <span>${order.escrowFeeUsd.toLocaleString()}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-bold text-base">
              <span>Total Payable</span>
              <span className="text-accent">${order.totalUsd.toLocaleString()}</span>
            </div>
          </div>

          <div className="border border-amber-500/30 bg-amber-500/5 p-4 rounded-lg flex gap-3 text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Payment must be completed within 48 hours of order execution to avoid default penalties. 
              Upon payment, funds are held in escrow until eWR transfer is confirmed.
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-6 border-t border-border">
          <Button 
            className="w-full h-12 text-base font-bold" 
            size="lg"
            onClick={handlePay}
            disabled={order.status === 'SETTLED' || initiate.isPending}
          >
            {order.status === 'SETTLED' ? 'Already Settled' : initiate.isPending ? 'Processing...' : 'Transfer Funds via B2B Gateway'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
