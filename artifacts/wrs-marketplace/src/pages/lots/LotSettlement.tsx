import { Link, useParams } from "wouter";
import { getGetOrderQueryKey, useGetOrder, useInitiateSettlement } from "@workspace/api-client-react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function LotSettlement() {
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId);
  const { data: order, isLoading } = useGetOrder(id, { query: { queryKey: getGetOrderQueryKey(id), enabled: Number.isFinite(id) && id > 0 } });
  const initiate = useInitiateSettlement();
  const { toast } = useToast();

  const handleSettle = () => {
    initiate.mutate(
      { data: { entityType: "ORDER", entityId: id } as any },
      {
        onSuccess: () => toast({ title: "Settlement initiated", description: "Funds are now being held in escrow." }),
        onError: (error: any) => toast({ title: "Settlement failed", description: error?.error ?? error?.message ?? "Please try again.", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <Skeleton className="mx-auto h-[420px] w-full max-w-2xl" />;
  if (!order) return <div className="py-16 text-center text-muted-foreground">Order not found.</div>;

  const commodityValue = order.totalUsd - order.platformFeeUsd - order.escrowFeeUsd;
  const settled = order.status === "SETTLED";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/dashboard"><Button variant="ghost" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settlement</h1>
          <p className="mt-1 text-muted-foreground">Complete payment to finalize this grain transfer.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order #{order.id}</CardTitle>
          <CardDescription>Status: <span className="font-semibold text-foreground">{order.status}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 rounded-lg bg-muted/50 p-4 font-mono text-sm">
            <Detail label="Commodity value" value={`$${commodityValue.toLocaleString()}`} />
            <Detail label="Platform fee" value={`$${order.platformFeeUsd.toLocaleString()}`} />
            <Detail label="Escrow fee" value={`$${order.escrowFeeUsd.toLocaleString()}`} />
            <div className="h-px bg-border" />
            <Detail label="Total payable" value={`$${order.totalUsd.toLocaleString()}`} strong />
          </div>
          {settled ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> This order has already been settled.
            </div>
          ) : (
            <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Payment is due within 48 hours. Funds remain in escrow until the eWR transfer is confirmed.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="h-11 w-full font-semibold" onClick={handleSettle} disabled={settled || initiate.isPending}>
            {initiate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {settled ? "Already settled" : "Transfer funds via B2B gateway"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-base font-bold" : ""}`}><span className="text-muted-foreground">{label}</span><span className={strong ? "text-primary" : ""}>{value}</span></div>;
}