import { useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetSettlement,
  useDisburseLeg,
  useGetMe,
} from "@workspace/api-client-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Lock,
  BanknoteIcon,
  Building2,
  User,
  ArrowDownToLine,
  SplitSquareVertical,
  FileCheck2,
  Landmark,
} from "lucide-react";

type LegStatus = "DISBURSED" | "PENDING" | "N_A";

function PhaseIcon({ done, na, locked }: { done: boolean; na?: boolean; locked?: boolean }) {
  if (done) return <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />;
  if (na) return <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-gray-50 shrink-0" />;
  if (locked) return <Lock className="w-5 h-5 text-gray-300 shrink-0" />;
  return <Circle className="w-5 h-5 text-yellow-500 shrink-0 animate-pulse" />;
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
      const labels: Record<string, string> = {
        bank: "SETTLE-P3 complete — bank repayment confirmed",
        platform: "SETTLE-P4 complete — platform fee routed",
        producer: "SETTLE-P5 complete — producer payout dispatched",
      };
      toast({ title: labels[leg], description: "Payout leg confirmed." });
      refetch();
    } catch (err: any) {
      toast({ title: "Disbursement failed", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return <Layout><div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div></Layout>;
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

  const bankStatus = settlement.bankLegStatus as LegStatus;
  const platformStatus = settlement.platformLegStatus as LegStatus;
  const producerStatus = settlement.producerLegStatus as LegStatus;

  const bankDone = bankStatus === "DISBURSED" || bankStatus === "N_A";
  const platformDone = platformStatus === "DISBURSED";
  const producerDone = producerStatus === "DISBURSED";

  const p4Locked = !bankDone;
  const p5Locked = !platformDone;

  const phases = [
    {
      code: "SETTLE-P1",
      icon: <ArrowDownToLine className="w-4 h-4 text-emerald-600" />,
      label: "Buyer Escrow Deposit",
      description: `Buyer transmits V_total = $${vTotal.toLocaleString()} to Bank Escrow. Escrow Status: FUNDS_LOCKED.`,
      done: true,
      na: false,
      locked: false,
      timestamp: settlement.createdAt,
      action: null,
    },
    {
      code: "SETTLE-P2",
      icon: <SplitSquareVertical className="w-4 h-4 text-blue-600" />,
      label: "Parallel Split Initiated",
      description: "Platform initiates split API payload to Bank Core. Internal clearing wires debited.",
      done: true,
      na: false,
      locked: false,
      timestamp: settlement.createdAt,
      action: null,
    },
    {
      code: "SETTLE-P3",
      icon: <Landmark className="w-4 h-4 text-orange-500" />,
      label: `Bank Liquidation Return (R_bank)`,
      description: rBank > 0
        ? `Bank routes R_bank = $${rBank.toLocaleString(undefined, { maximumFractionDigits: 2 })} to internal loan ledger. Principal + yield cleared. Lien Release: TRIGGERED.`
        : "No active loan — bank leg not applicable (N_A).",
      done: bankDone,
      na: bankStatus === "N_A",
      locked: false,
      timestamp: settlement.bankLegDisbursedAt,
      action: canDisburse && bankStatus === "PENDING" ? () => handleDisburse("bank") : null,
      actionLabel: "Confirm R_bank",
    },
    {
      code: "SETTLE-P4",
      icon: <BanknoteIcon className="w-4 h-4 text-blue-500" />,
      label: `Platform Operational Fee (F_platform)`,
      description: `Bank routes F_platform = $${fPlatform.toLocaleString(undefined, { maximumFractionDigits: 2 })} (2% of V_total) to Platform Operational Wallet.`,
      done: platformDone,
      na: false,
      locked: p4Locked,
      timestamp: settlement.platformLegDisbursedAt,
      action: canDisburse && platformStatus === "PENDING" && !p4Locked ? () => handleDisburse("platform") : null,
      actionLabel: "Confirm F_platform",
    },
    {
      code: "SETTLE-P5",
      icon: <User className="w-4 h-4 text-green-600" />,
      label: `Net Producer Residual (P_producer)`,
      description: `Bank dispatches P_producer = $${pProducer.toLocaleString(undefined, { maximumFractionDigits: 2 })} (V_total − R_bank − F_platform) to Farmer Account. Account state closed.`,
      done: producerDone,
      na: false,
      locked: p5Locked,
      timestamp: settlement.producerLegDisbursedAt,
      action: canDisburse && producerStatus === "PENDING" && !p5Locked ? () => handleDisburse("producer") : null,
      actionLabel: "Confirm P_producer",
    },
    {
      code: "SETTLE-P6",
      icon: <FileCheck2 className="w-4 h-4 text-purple-600" />,
      label: "eWRS-CR Title Transfer",
      description: "Platform transmits final payload to eWRS-CR API. Lien deleted. e-WR title changes permanently to Buyer ID. Status: SETTLED.",
      done: isComplete,
      na: false,
      locked: !isComplete,
      timestamp: settlement.completedAt,
      action: null,
    },
  ];

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

            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {rBank > 0 && (
                <div
                  className="bg-orange-400 h-full"
                  style={{ width: `${pctBank}%` }}
                  title={`Bank R_bank: $${rBank.toLocaleString()}`}
                />
              )}
              <div
                className="bg-blue-400 h-full"
                style={{ width: `${pctPlatform}%` }}
                title={`Platform F_platform: $${fPlatform.toLocaleString()}`}
              />
              <div
                className="bg-green-500 h-full flex-1"
                title={`Producer P_producer: $${pProducer.toLocaleString()}`}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {rBank > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />
                  R_bank {pctBank.toFixed(1)}% · ${rBank.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />
                F_platform {pctPlatform.toFixed(1)}% · ${fPlatform.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
                P_producer {pctProducer.toFixed(1)}% · ${pProducer.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 6-phase settlement sequence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settlement Phase Sequence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {phases.map((phase, idx) => (
              <div key={phase.code}>
                <div className={`flex gap-4 py-4 ${phase.locked ? "opacity-50" : ""}`}>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <PhaseIcon done={phase.done} na={phase.na} locked={phase.locked && !phase.done} />
                    {idx < phases.length - 1 && (
                      <div className={`w-px flex-1 min-h-[24px] ${phase.done ? "bg-green-300" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {phase.icon}
                      <span className="font-mono text-xs font-bold text-muted-foreground">{phase.code}</span>
                      <span className="font-semibold text-sm">{phase.label}</span>
                      {phase.done && !phase.na && (
                        <span className="text-xs text-green-600 font-medium">CONFIRMED</span>
                      )}
                      {phase.na && (
                        <span className="text-xs text-gray-400 font-medium">N/A</span>
                      )}
                      {phase.locked && !phase.done && (
                        <span className="text-xs text-gray-400 font-medium">AWAITING PRIOR PHASE</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{phase.description}</p>
                    {phase.timestamp && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {new Date(phase.timestamp).toLocaleString()}
                      </p>
                    )}
                    {phase.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={phase.action}
                        disabled={disbursing}
                      >
                        {phase.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
                {idx < phases.length - 1 && <Separator />}
              </div>
            ))}
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
                <p className="font-semibold text-green-800">Settlement Complete — SETTLE-P6 Executed</p>
                <p className="text-xs text-green-700">
                  All payout legs disbursed and eWRS-CR title transfer confirmed on{" "}
                  {new Date(settlement.completedAt!).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isComplete && (settlement as any).releaseToken && (
          <Card className="border-[hsl(155,100%,18%)]/30 bg-[hsl(155,100%,18%)]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" style={{ color: "hsl(155 100% 18%)" }} />
                Digital Release Token (DRT)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="p-2 rounded-lg border border-[hsl(155,100%,18%)]/20 bg-white shrink-0">
                <QRCodeSVG
                  value={(settlement as any).releaseToken.token}
                  size={120}
                  fgColor="hsl(155 100% 18%)"
                />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "hsl(155 100% 18%)" }}>
                  Warehouse Release Authorisation
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Present this QR code at the warehouse gate or share the token with the warehouse
                  operator to authorise physical release of goods. This token is bound to this settlement
                  and can only be used once.
                </p>
                <div className="bg-muted rounded px-2.5 py-1.5 flex items-center gap-2">
                  <code className="text-xs font-mono truncate flex-1">
                    {(settlement as any).releaseToken.token}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Issued: {new Date((settlement as any).releaseToken.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
