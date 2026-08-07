/**
 * BrokerMandateHolders: broker's view of their mandate portfolio.
 *
 * Shows each producer who has granted an active mandate, alongside their
 * INGESTED TEA eWRs that the broker can immediately catalogue into lots.
 * Also shows pending mandate requests so the broker can track what is
 * awaiting producer confirmation.
 */

import { useLocation } from "wouter";
import {
  useGetMyMandates,
  useGetMe,
  getGetMyMandatesQueryKey,
  useCreateMandateRequest,
  useListMandateRequests,
  useCancelMandateRequest,
  getListMandateRequestsQueryKey,
} from "@workspace/api-client-react";
import {
  MandateRequest,
  MandateRequestStatus,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Warehouse,
  PlusCircle,
  FileText,
  Link2,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

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

function isActive(m: {
  revoked: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  if (m.revoked) return false;
  const now = new Date();
  const from = m.validFrom ? new Date(m.validFrom) : null;
  const to = m.validTo ? new Date(m.validTo) : null;
  return (from === null || from <= now) && (to === null || to > now);
}

// ── Token copy button ─────────────────────────────────────────────────────────

function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {token.slice(0, 8)}…
    </button>
  );
}

// ── Request status badge ──────────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <Badge className="rounded-none text-[9px] uppercase tracking-wider bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-2.5 h-2.5" /> Pending
      </Badge>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <Badge className="rounded-none text-[9px] uppercase tracking-wider bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge className="rounded-none text-[9px] uppercase tracking-wider bg-zinc-100 text-zinc-500 border-zinc-200 gap-1">
        <XCircle className="w-2.5 h-2.5" /> Cancelled
      </Badge>
    );
  }
  return (
    <Badge className="rounded-none text-[9px] uppercase tracking-wider bg-zinc-100 text-zinc-500 border-zinc-200">
      Expired
    </Badge>
  );
}

// ── Generate request dialog ───────────────────────────────────────────────────

function GenerateMandateRequestDialog({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const { mutate, isPending } = useCreateMandateRequest();

  function handleSubmit() {
    mutate(
      {
        data: {
          commodityType: "TEA",
          note: note || undefined,
          expiryDays,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNote("");
          onCreated?.();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-none gap-1.5 text-xs">
          <Link2 className="w-3.5 h-3.5" /> Generate Request Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate TEA Mandate Request</DialogTitle>
          <DialogDescription>
            Create a shareable token that a tea producer can use to grant you a
            mandate via their API key — no producer sign-in required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="e.g. Kericho highlands cooperative, Q3 2026"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Token valid for (days)
            </label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              min={1}
              max={30}
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
            />
          </div>

          <div className="rounded-none bg-muted p-3 text-xs text-muted-foreground space-y-1 border border-border">
            <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
              How it works
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Generate a token and share it with the producer.</li>
              <li>
                They POST the token to{" "}
                <code className="font-mono">/api/broker-mandates/confirm</code>{" "}
                using their integration API key.
              </li>
              <li>Their eWRs appear here once confirmed.</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="rounded-none" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Generating…" : "Generate Token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrokerMandateHolders() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: me } = useGetMe();

  const { data: mandates = [], isLoading: mandatesLoading } = useGetMyMandates(
    {
      query: { enabled: !!me, queryKey: getGetMyMandatesQueryKey() },
    }
  );

  const { data: requests = [], isLoading: requestsLoading } =
    useListMandateRequests({
      query: { enabled: !!me, queryKey: getListMandateRequestsQueryKey() },
    });

  const { mutate: cancelRequest } = useCancelMandateRequest();

  const { data: availableEwrs = [], isLoading: ewrsLoading } = useQuery<
    AvailableEwr[]
  >({
    queryKey: ["/api/ewrs/broker-available"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${BASE}/api/ewrs/broker-available`, { signal });
      if (!res.ok) throw new Error("Failed to load available eWRs");
      return res.json();
    },
    enabled: !!me,
  });

  const activeMandates = mandates.filter(isActive);

  const pendingRequests = requests.filter(
    (r) =>
      r.status === MandateRequestStatus.PENDING &&
      new Date(r.expiresAt) > new Date()
  );
  const pastRequests = requests.filter(
    (r) =>
      r.status !== MandateRequestStatus.PENDING ||
      new Date(r.expiresAt) <= new Date()
  );

  // Group eWRs by ownerId for O(1) lookup per mandate
  const ewrsByOwner = availableEwrs.reduce<Record<number, AvailableEwr[]>>(
    (acc, ewr) => {
      (acc[ewr.ownerId] ??= []).push(ewr);
      return acc;
    },
    {}
  );

  const commissionDisplay = (raw: string | null | undefined) => {
    if (!raw) return "Default";
    return `${(parseFloat(raw) * 100).toFixed(2)}%`;
  };

  const isLoading = mandatesLoading || ewrsLoading || requestsLoading;

  function handleCancelRequest(id: number) {
    cancelRequest(
      { requestId: id },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListMandateRequestsQueryKey() }),
      }
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Mandate Holders"
          description="Producers who have authorised you to catalogue their tea, and the eWRs ready to list."
        />
        <GenerateMandateRequestDialog
          onCreated={() =>
            qc.invalidateQueries({ queryKey: getListMandateRequestsQueryKey() })
          }
        />
      </div>

      {/* Pending mandate requests */}
      {(pendingRequests.length > 0 || requestsLoading) && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Producer Confirmation
          </h2>
          <div className="border border-amber-200 bg-amber-50/30 divide-y divide-amber-100">
            {requestsLoading ? (
              <div className="px-5 py-4 h-12 bg-muted/30 animate-pulse" />
            ) : (
              pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RequestStatusBadge status={r.status} />
                      <Badge className="rounded-none text-[9px] uppercase tracking-wider">
                        TEA
                      </Badge>
                      <CopyTokenButton token={r.token} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created{" "}
                      {format(new Date(r.createdAt), "MMM d, yyyy HH:mm")} ·
                      expires {format(new Date(r.expiresAt), "MMM d, yyyy")}
                    </p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        "{r.note}"
                      </p>
                    )}
                    <p className="text-xs text-amber-700 mt-1">
                      Share this token with the producer — they POST it to{" "}
                      <code className="font-mono">
                        /api/broker-mandates/confirm
                      </code>{" "}
                      with their API key.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none text-xs shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => handleCancelRequest(r.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Active mandate holders + eWRs */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 bg-muted/30 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : activeMandates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-border bg-muted/5">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No active mandates</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Generate a request token above and share it with a producer. Once
            they confirm via their API key, their eWRs will appear here.
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
                      <span className="font-semibold text-foreground">
                        {commissionDisplay(
                          mandate.commissionRateOverride != null
                            ? String(mandate.commissionRateOverride)
                            : null
                        )}
                      </span>{" "}
                      commission
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
                      No INGESTED eWRs from this producer yet. The factory
                      portal will push them here automatically when a batch
                      leaves.
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
                            <span className="font-mono text-sm font-semibold">
                              {ewr.ewrsReceiptId}
                            </span>
                            {ewr.teaProcessingType && (
                              <Badge
                                variant="secondary"
                                className="rounded-none text-[9px] uppercase tracking-wider"
                              >
                                {ewr.teaProcessingType}
                              </Badge>
                            )}
                            {ewr.teaLeafGrade && (
                              <Badge
                                variant="outline"
                                className="rounded-none text-[9px] uppercase tracking-wider"
                              >
                                {ewr.teaLeafGrade}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ewr.grade} ·{" "}
                            {parseFloat(ewr.weightMt).toFixed(3)} MT ·{" "}
                            {ewr.warehouseCode} · {ewr.harvestSeason}
                            {ewr.teaInvoiceSerial
                              ? ` · Inv. ${ewr.teaInvoiceSerial}`
                              : ""}
                          </p>
                          {ewr.estimatedValueUsd && (
                            <p className="text-xs text-muted-foreground">
                              Est. USD{" "}
                              {parseFloat(
                                ewr.estimatedValueUsd
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="rounded-none h-8 px-4 gap-2 shrink-0 text-xs font-semibold"
                          onClick={() =>
                            setLocation(`/broker/lots/new?ewrId=${ewr.id}`)
                          }
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
                      {ownerEwrs.length} eWR
                      {ownerEwrs.length !== 1 ? "s" : ""} available to
                      catalogue
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

      {/* Inactive mandates */}
      {!isLoading && mandates.filter((m) => !isActive(m)).length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Inactive / Revoked Mandates
          </h2>
          <div className="border border-border divide-y divide-border opacity-60">
            {mandates
              .filter((m) => !isActive(m))
              .map((m) => {
                const ownerName = (m as any).ownerName as string | null;
                return (
                  <div
                    key={m.id}
                    className="px-5 py-3 flex items-center justify-between gap-4"
                  >
                    <span className="text-sm font-medium">
                      {ownerName ?? `Producer #${m.ownerId}`}
                    </span>
                    <Badge
                      variant="secondary"
                      className="rounded-none text-[10px] uppercase tracking-wider"
                    >
                      {m.revoked ? "Revoked" : "Expired"}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Past requests */}
      {pastRequests.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Past Mandate Requests
          </h2>
          <div className="border border-border divide-y divide-border opacity-70">
            {pastRequests.map((r) => {
              const effectiveStatus =
                r.status === MandateRequestStatus.PENDING &&
                new Date(r.expiresAt) < new Date()
                  ? "EXPIRED"
                  : r.status;
              return (
                <div
                  key={r.id}
                  className="px-5 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <RequestStatusBadge status={effectiveStatus} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.token.slice(0, 8)}…
                      </span>
                    </div>
                    {r.note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        "{r.note}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
