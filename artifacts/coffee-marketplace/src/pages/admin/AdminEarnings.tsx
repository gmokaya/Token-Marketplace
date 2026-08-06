import { useGetPlatformEarnings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, ArrowUpRight } from "lucide-react";

export default function AdminEarnings() {
  const { data: earnings, isLoading } = useGetPlatformEarnings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Earnings</h1>
        <p className="text-muted-foreground mt-1">Revenue generated from trading and settlement fees.</p>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Platform Trading Fees <Landmark className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">${(earnings?.totalPlatformFeesUsd || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Escrow Service Fees <ArrowUpRight className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">${(earnings?.totalEscrowFeesUsd || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Settled Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">{earnings?.completedSettlementCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
