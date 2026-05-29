import { useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetSettlement,
  useDisburseLeg,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, XCircle, BanknoteIcon, Building2, User } from "lucide-react";

const LEG_STYLES: Record<string, string> = {
  PENDING: "text-yellow-600",
  DISBURSED: "text-green-600",
  N_A: "text-gray-400",
};

function LegIcon({ status }: { status: string }) {
  if (status === "DISBURSED") return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  if (status === "N_A") return <XCircle className="w-5 h-5 text-gray-300" />;
  return <Circle className="w-5 h-5 text-yellow-500" />;
}

export default function SettlementDetail() {
  const { settlementId } = useParams<{ settlementId: string }>();
  const { toast } = useToast();

  const id = parseInt(settlementId ?? "0");
  const { data: settlement, isLoading, refetch } = useGetSettlement(id, {
    query: { refetchInterval: 8000 } as any,
  });
  const { data: me } = useGetMe();
  const { mutateAsync: disburse, isPending: disbursing } = useDisburseLeg();

  const canDisburse = me?.tier === "ENABLER" || me?.tier === "FINANCIER";

  async function handleDisburse(leg: "bank" | "platform" | "producer") {
    try {
      await disburse({ settlementId: id, data: { leg } });
      toast({ title: `${leg.charAt(0).toUpperCase() + leg.slice(1)} leg disbursed`, description: "Payout confirmed." });
      refetch();
    } catch (err: any) {
      toast({ title: "Disbursement failed", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return <Layout><div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></Layout>;
  }

  if (!settlement) {
    return <Layout><div className="text-center py-16 text-muted-foreground">Settlement not found.</div></Layout>;
  }

  const loan = (settlement as any).loan;
  const isComplete = !!settlement.completedAt;
  const vTotal = Number(settlement.vTotalUsd);
  const rBank = Number(settlement.rBankUsd);
  const fPlatform = Number(settlement.fPlatformUsd);
  const pProducer = Number(settlement.pProducerUsd);

  const pctBank = vTotal > 0 ? (rBank / vTotal) * 100 : 0;
  const pctPlatform = vTotal > 0 ? (fPlatform / vTotal) * 100 : 0;
  const pctProducer = vTotal > 0 ? (pProducer / vTotal) * 100 : 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settlement #{settlement.id}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {settlement.entityType} #{settlement.entityId}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${isComplete ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}`}>
            {isComplete ? "COMPLETED" : "IN PROGRESS"}
          </span>
        </div>

        {/* Waterfall breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settlement Waterfall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">${vTotal.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Proceeds (V_total)</p>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {rBank > 0 && (
                <div
                  className="bg-orange-400 h-full"
                  style={{ width: `${pctBank}%` }}
                  title={`Bank: $${rBank.toLocaleString()}`}
                />
              )}
              <div
                className="bg-blue-400 h-full"
                style={{ width: `${pctPlatform}%` }}
                title={`Platform: $${fPlatform.toLocaleString()}`}
              />
              <div
                className="bg-green-500 h-full flex-1"
                title={`Producer: $${pProducer.toLocaleString()}`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {rBank > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />Bank {pctBank.toFixed(1)}%</span>}
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />Platform {pctPlatform.toFixed(1)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Producer {pctProducer.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Payout legs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payout Legs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bank leg */}
            <div className="flex items-center gap-4">
              <LegIcon status={settlement.bankLegStatus} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-sm">Bank Repayment (R_bank)</span>
                  <span className={`text-xs ${LEG_STYLES[settlement.bankLegStatus]}`}>{settlement.bankLegStatus}</span>
                </div>
                {rBank > 0 ? (
                  <p className="text-xs text-muted-foreground">Principal + interest = ${rBank.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No active loan — not applicable</p>
                )}
                {settlement.bankLegDisbursedAt && (
                  <p className="text-xs text-green-600">Disbursed {new Date(settlement.bankLegDisbursedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className={`font-bold ${rBank > 0 ? "text-orange-600" : "text-gray-400"}`}>${rBank.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                {canDisburse && settlement.bankLegStatus === "PENDING" && (
                  <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={() => handleDisburse("bank")} disabled={disbursing}>
                    Confirm
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Platform leg */}
            <div className="flex items-center gap-4">
              <LegIcon status={settlement.platformLegStatus} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Platform Fee (F_platform)</span>
                  <span className={`text-xs ${LEG_STYLES[settlement.platformLegStatus]}`}>{settlement.platformLegStatus}</span>
                </div>
                <p className="text-xs text-muted-foreground">2% of total proceeds</p>
                {settlement.platformLegDisbursedAt && (
                  <p className="text-xs text-green-600">Disbursed {new Date(settlement.platformLegDisbursedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">${fPlatform.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                {canDisburse && settlement.platformLegStatus === "PENDING" && (
                  <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={() => handleDisburse("platform")} disabled={disbursing}>
                    Confirm
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Producer leg */}
            <div className="flex items-center gap-4">
              <LegIcon status={settlement.producerLegStatus} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Producer Net (P_producer)</span>
                  <span className={`text-xs ${LEG_STYLES[settlement.producerLegStatus]}`}>{settlement.producerLegStatus}</span>
                </div>
                <p className="text-xs text-muted-foreground">V_total − R_bank − F_platform</p>
                {settlement.producerLegDisbursedAt && (
                  <p className="text-xs text-green-600">Disbursed {new Date(settlement.producerLegDisbursedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-green-700">${pProducer.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                {canDisburse && settlement.producerLegStatus === "PENDING" && (
                  <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={() => handleDisburse("producer")} disabled={disbursing}>
                    Confirm
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Principal</p><p className="font-bold">${Number(loan.principalUsd).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-bold">{(Number(loan.interestRate) * 100).toFixed(1)}% p.a.</p></div>
              <div><p className="text-xs text-muted-foreground">Start</p><p className="font-bold">{new Date(loan.startDate).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className={`font-bold ${loan.lienStatus === "REPAID" ? "text-green-600" : "text-orange-600"}`}>{loan.lienStatus}</p></div>
            </CardContent>
          </Card>
        )}

        {isComplete && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Settlement Complete</p>
                <p className="text-xs text-green-700">All payout legs disbursed on {new Date(settlement.completedAt!).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
