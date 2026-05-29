import { useState, useEffect } from "react";
import { useListOrders, useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    
    const tick = () => {
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }
      
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono tabular-nums text-red-600 font-bold">{timeLeft}</span>;
}

export default function Orders() {
  const { data: user } = useGetMe();
  const { data: orders, isLoading } = useListOrders();

  if (user?.tier === "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          Producers do not make buy orders.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map(order => (
              <Card key={order.id} className={order.status === "PENDING_SETTLEMENT" ? "border-amber-500" : ""}>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">From Seller: {order.sellerName || "Unknown"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === "PENDING_SETTLEMENT" ? "destructive" : "secondary"}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Commodity</p>
                      <p className="font-medium">{order.commodityType} - {order.weightMt}MT</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="font-medium">${order.totalUsd.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Locked At</p>
                      <p className="font-medium">{new Date(order.lockedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      {order.status === "PENDING_SETTLEMENT" && (
                        <>
                          <p className="text-muted-foreground">Settlement Time Left</p>
                          <CountdownTimer expiresAt={order.expiresAt} />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {orders?.length === 0 && (
              <div className="py-12 text-center border border-dashed text-muted-foreground">
                You have no orders.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}