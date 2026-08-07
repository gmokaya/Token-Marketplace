import { useGetPlatformEarnings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Landmark, ArrowUpRight, CheckCircle } from "lucide-react";

export default function AdminEarnings() {
  const { data: earnings, isLoading } = useGetPlatformEarnings();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Platform Earnings"
        description="Revenue generated from trading and settlement fees."
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Platform Trading Fees <Landmark className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">
                ${(earnings?.totalPlatformFeesUsd || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cumulative</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Escrow Service Fees <ArrowUpRight className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">
                ${(earnings?.totalEscrowFeesUsd || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cumulative</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Settled Transactions <CheckCircle className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold">
                {earnings?.completedSettlementCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
