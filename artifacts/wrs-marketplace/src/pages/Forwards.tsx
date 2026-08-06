import { useState } from "react";
import { useListForwardContracts, useGetMe, type ListForwardContractsStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { CreateForwardDialog } from "@/components/CreateForwardDialog";

const STATUS_COLORS: Record<string, string> = {
  PENDING_SIGNATURE: "bg-slate-100 text-slate-700 border-slate-300",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  MATURED: "bg-blue-100 text-blue-800 border-blue-200",
  DEFAULTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
};

const BOND_COLORS: Record<string, string> = {
  PENDING_BOND: "text-slate-600",
  ACTIVE: "text-green-600",
  FORFEITED: "text-red-600",
  RELEASED: "text-gray-500",
};

export default function Forwards() {
  const { data: me } = useGetMe();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const myId = me?.id;
  const isProducer = me?.tier === "PRODUCER";
  const isOffTaker = me?.tier === "OFF_TAKER";

  const { data: contracts, isLoading } = useListForwardContracts(
    {
      status: (statusFilter || undefined) as ListForwardContractsStatus | undefined,
      sellerId: isProducer ? myId : undefined,
      // OFF_TAKERs browse all contracts (especially PENDING_SIGNATURE ones to co-sign)
      // Do NOT filter by buyerId here or new buyers see an empty list
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { refetchInterval: 10000 } as any }
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Forward Contracts</h1>
            <p className="text-muted-foreground mt-1">Structured long-term supply agreements with mutual performance bonds</p>
          </div>
          {isProducer && <CreateForwardDialog />}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["", "PENDING_SIGNATURE", "ACTIVE", "MATURED", "DEFAULTED", "CANCELLED"] as const).map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s ? s.replace("_", " ") : "All"}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : !contracts?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No forward contracts</p>
            <p className="text-sm mt-1">
              {isProducer ? "Create a forward contract to offer a future delivery." : "Forward contracts from producers will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contracts.map(c => (
              <Link key={c.id} href={`/forwards/${c.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold">{c.commodityType ?? "-"} · {c.grade ?? "-"}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.warehouseCode} · {c.weightMt} MT</p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[c.contractStatus] ?? ""}`}>
                        {c.contractStatus.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Delivery Price</p>
                        <p className="font-bold text-sm">${Number(c.deliveryPriceUsd).toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Bond (15%)</p>
                        <p className="font-semibold text-sm">${Number(c.performanceBondUsd).toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Matures: {new Date(c.maturityDate).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <span className={`font-medium ${BOND_COLORS[c.sellerBondStatus]}`}>S: {c.sellerBondStatus}</span>
                        <span className={`font-medium ${BOND_COLORS[c.buyerBondStatus]}`}>B: {c.buyerBondStatus}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Seller: {c.sellerName ?? "-"}{c.buyerName ? ` · Buyer: ${c.buyerName}` : " · Awaiting co-signer"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
