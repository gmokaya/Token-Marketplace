/**
 * BrokerMandateHolders — broker's view of their mandate portfolio.
 *
 * Shows each producer who has granted an active mandate, alongside their
 * INGESTED TEA eWRs that the broker can immediately catalogue into lots.
 * This is the operational starting point of the broker workflow:
 *   1. Producer grants mandate → appears here
 *   2. Factory pushes eWR → appears under that producer
 *   3. Broker clicks "List this eWR" → lands on NewTeaLot pre-selected
 */

import { useLocation } from "wouter";
import { useGetMyMandates, useGetMe, getGetMyMandatesQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Warehouse, PlusCircle, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AvailableEwr {
  id: number;
  ewrsReceiptId: string;
  warehouseCode: string;
  grade: string;
  weightMt: string;
  harvestSeason: string;
  ownerId: number;
  ownerName: string | null;
  teaProcessingType: string | null;
  teaLeafGrade: string | null;
  teaInvoiceSerial: string | null;
  estimatedValueUsd: string | null;
}

function isActive(m: { revoked: boolean; validFrom?: string | null; validTo?: string | null }) {
  if (m.revoked) return false;
  const now = new Date();
  const from = m.validFrom ? new Date(m.validFrom) : null;
  const to   = m.validTo   ? new Date(m.validTo)   : null;
  return (from === null || from <= now) && (to === null || to > now);
}

export default function BrokerMandateHolders() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();

  const { data: mandates = [], isLoading: mandatesLoading } = useGetMyMandates({
    query: { enabled: !!me, queryKey: getGetMyMandatesQueryKey() },
  });

  const { data: availableEwrs = [], isLoading: ewrsLoading } = useQuery<AvailableEwr[]>({
    queryKey: ["/api/ewrs/broker-available"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/broker-available`, { signal });
      if (!res.ok) throw new Error("Failed to load available eWRs");
      return res.json();
    },
    enabled: !!me,
  });

  const activeMandates = mandates.filter(isActive);

  // Group eWRs by ownerId for O(1) lookup per mandate
  const ewrsByOwner = availableEwrs.reduce<Record<number, AvailableEwr[]>>((acc, ewr) => {
    (acc[ewr.ownerId] ??= []).push(ewr);
    return acc;
  }, {});

  const commissionDisplay = (raw: string | null | undefined) => {
    if (!raw) return "Default";
    return `${(parseFloat(raw) * 100).toFixed(2)}%`;
  };

  const isLoading = mandatesLoading || ewrsLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mandate Holders"
        description="Producers who have authorised you to catalogue their tea — and the eWRs ready to list."
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-muted/30 animate-pulse border border-border" />
          ))}
        </div>
      ) : activeMandates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No active mandates</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Ask a producer to go to their Mandates page and grant you a TEA mandate.
            Once they do, their available eWRs will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeMandates.map((mandate) => {
            const ownerName = (mandate as any).ownerName as string | null;
            const ownerEwrs = ewrsByOwner[mandate.ownerId] ?? [];

            return (
              <div key={mandate.id} className="border border-border">
                {/* Mandate header */}
                <div className="bg-muted/30 border-b border-border px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-base truncate">
                      {ownerName ?? `Producer #${mandate.ownerId}`}
                    </span>
                    <Badge className="rounded-none text-[10px] uppercase tracking-wider shrink-0">
                      Active mandate
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                    <span>
                      <span className="font-semibold text-foreground">{commissionDisplay(mandate.commissionRateOverride)}</span>
                      {" "}commission
                    </span>
                    {mandate.validTo && (
                      <span>
                        expires{" "}
                        <span className="font-semibold text-foreground">
                          {new Date(mandate.validTo).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* eWRs from this producer */}
                {ownerEwrs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <Warehouse className="w-6 h-6 text-muted-foreground/40" />
                    <span>
                      No INGESTED eWRs from this producer yet.
                      The factory portal will push them here automatically when a batch leaves.
                    </span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {ownerEwrs.map((ewr) => (
                      <div
                        key={ewr.id}
                        className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold">{ewr.ewrsReceiptId}</span>
                            {ewr.teaProcessingType && (
                              <Badge variant="secondary" className="rounded-none text-[9px] uppercase tracking-wider">
                                {ewr.teaProcessingType}
                              </Badge>
                            )}
                            {ewr.teaLeafGrade && (
                              <Badge variant="outline" className="rounded-none text-[9px] uppercase tracking-wider">
                                {ewr.teaLeafGrade}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ewr.grade} · {parseFloat(ewr.weightMt).toFixed(3)} MT · {ewr.warehouseCode} · {ewr.harvestSeason}
                            {ewr.teaInvoiceSerial ? ` · Inv. ${ewr.teaInvoiceSerial}` : ""}
                          </p>
                          {ewr.estimatedValueUsd && (
                            <p className="text-xs text-muted-foreground">
                              Est. USD {parseFloat(ewr.estimatedValueUsd).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="rounded-none h-8 px-4 gap-2 shrink-0 text-xs font-semibold"
                          onClick={() => setLocation(`/broker/lots/new?ewrId=${ewr.id}`)}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          List this eWR
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {ownerEwrs.length > 0 && (
                  <div className="px-5 py-3 bg-muted/10 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {ownerEwrs.length} eWR{ownerEwrs.length !== 1 ? "s" : ""} available to catalogue
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none text-xs h-7"
                      onClick={() => setLocation("/broker/lots/new")}
                    >
                      Open lot form →
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inactive mandates section */}
      {!isLoading && mandates.filter((m) => !isActive(m)).length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Inactive / Revoked Mandates
          </h2>
          <div className="border border-border divide-y divide-border opacity-60">
            {mandates.filter((m) => !isActive(m)).map((m) => {
              const ownerName = (m as any).ownerName as string | null;
              return (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">{ownerName ?? `Producer #${m.ownerId}`}</span>
                  <Badge variant="secondary" className="rounded-none text-[10px] uppercase tracking-wider">
                    {m.revoked ? "Revoked" : "Expired"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
