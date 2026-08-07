import {
  useGetMyMandates,
  useCreateMandateRequest,
  useListMandateRequests,
  useCancelMandateRequest,
  getListMandateRequestsQueryKey,
} from "@workspace/api-client-react";
import {
  BrokerMandate,
  MandateRequest,
  MandateRequestStatus,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  ShieldCheck,
  Plus,
  CalendarClock,
  Building2,
  Link2,
  Copy,
  Check,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ── Mandate card (existing flow) ─────────────────────────────────────────────

function MandateCard({ mandate }: { mandate: BrokerMandate }) {
  const isActive =
    !mandate.revoked &&
    (!mandate.validTo || new Date(mandate.validTo) > new Date());

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {mandate.ownerName ?? `Producer #${mandate.ownerId}`}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${
                isActive
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}
            >
              {mandate.revoked ? "Revoked" : isActive ? "Active" : "Expired"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {mandate.commodityType}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Valid from {format(new Date(mandate.validFrom), "MMM d, yyyy")}
            {mandate.validTo &&
              ` · expires ${format(new Date(mandate.validTo), "MMM d, yyyy")}`}
          </p>
          {mandate.permissions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Permissions: {mandate.permissions.join(", ")}
            </p>
          )}
          {mandate.commissionRateOverride != null && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Commission: {(mandate.commissionRateOverride * 100).toFixed(2)}%
            </p>
          )}
        </div>
      </div>
      {isActive && (
        <Link href="/broker/lots/new">
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> List Lot
          </Button>
        </Link>
      )}
    </div>
  );
}

// ── Mandate request status badge ─────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1"
      >
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-green-50 text-green-700 border-green-200 gap-1"
      >
        <CheckCircle2 className="w-3 h-3" /> Confirmed
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-zinc-100 text-zinc-500 border-zinc-200 gap-1"
      >
        <XCircle className="w-3 h-3" /> Cancelled
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs bg-zinc-100 text-zinc-500 border-zinc-200"
    >
      Expired
    </Badge>
  );
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
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5 h-7 px-2 text-xs font-mono"
      onClick={copy}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {token.slice(0, 8)}…
    </Button>
  );
}

// ── Mandate request card ──────────────────────────────────────────────────────

function MandateRequestCard({
  request,
  onCancel,
}: {
  request: MandateRequest;
  onCancel: (id: number) => void;
}) {
  const isPending = request.status === MandateRequestStatus.PENDING;
  const isExpired =
    isPending && new Date(request.expiresAt) < new Date()
      ? true
      : false;
  const effectiveStatus = isExpired ? "EXPIRED" : request.status;

  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <RequestStatusBadge status={effectiveStatus} />
            <Badge variant="secondary" className="text-xs font-mono">
              {request.commodityType}
            </Badge>
            {isPending && !isExpired && (
              <CopyTokenButton token={request.token} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Created {format(new Date(request.createdAt), "MMM d, yyyy HH:mm")}
            {" · "}
            {isExpired
              ? "Expired"
              : `Expires ${format(new Date(request.expiresAt), "MMM d, yyyy")}`}
          </p>
          {request.note && (
            <p className="text-xs text-muted-foreground italic mt-0.5">
              "{request.note}"
            </p>
          )}
          {isPending && !isExpired && (
            <p className="text-xs text-blue-600 mt-1">
              Share this token with the producer. They POST it to{" "}
              <code className="font-mono bg-blue-50 px-1 rounded">
                /api/broker-mandates/confirm
              </code>{" "}
              with their API key.
            </p>
          )}
          {request.status === "CONFIRMED" && (
            <p className="text-xs text-green-600 mt-0.5">
              Confirmed{" "}
              {request.confirmedAt &&
                format(new Date(request.confirmedAt), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
      {isPending && !isExpired && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => onCancel(request.id)}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

// ── Generate request dialog ───────────────────────────────────────────────────

function GenerateMandateRequestDialog({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [commodity, setCommodity] = useState("COFFEE");
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const { mutate, isPending } = useCreateMandateRequest();

  function handleSubmit() {
    mutate(
      {
        data: {
          commodityType: commodity as any,
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
        <Button size="sm" className="gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Generate Request Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Mandate Request</DialogTitle>
          <DialogDescription>
            Create a shareable token that a producer can use to grant you a
            mandate via their API key — no producer sign-in required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Commodity</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
            >
              <option value="COFFEE">COFFEE</option>
              <option value="TEA">TEA</option>
              <option value="MAIZE">MAIZE</option>
              <option value="RICE">RICE</option>
              <option value="AVOCADO">AVOCADO</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="e.g. Kipkelion Arabica Co-op 2026 harvest"
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

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>You generate a token here and share it with the producer.</li>
              <li>
                The producer POSTs the token to{" "}
                <code className="font-mono">/api/broker-mandates/confirm</code>{" "}
                with their API key.
              </li>
              <li>The mandate appears here once they confirm.</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Generating…" : "Generate Token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function BrokerMandates() {
  const qc = useQueryClient();
  const { data: mandates, isLoading: mandatesLoading } = useGetMyMandates();
  const { data: requests, isLoading: requestsLoading } =
    useListMandateRequests();
  const { mutate: cancelRequest } = useCancelMandateRequest();

  const isLoading = mandatesLoading || requestsLoading;

  const active = (mandates ?? []).filter(
    (m) =>
      !m.revoked && (!m.validTo || new Date(m.validTo) > new Date())
  );
  const expired = (mandates ?? []).filter(
    (m) => m.revoked || (m.validTo && new Date(m.validTo) <= new Date())
  );

  const pendingRequests = (requests ?? []).filter(
    (r) =>
      r.status === MandateRequestStatus.PENDING &&
      new Date(r.expiresAt) > new Date()
  );
  const pastRequests = (requests ?? []).filter(
    (r) =>
      r.status !== MandateRequestStatus.PENDING ||
      new Date(r.expiresAt) <= new Date()
  );

  function handleCancel(id: number) {
    cancelRequest(
      { requestId: id },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListMandateRequestsQueryKey() }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mandate Holders
          </h1>
          <p className="text-muted-foreground mt-1">
            Producer cooperatives that have authorized you to trade on their
            behalf.
          </p>
        </div>
        <GenerateMandateRequestDialog
          onCreated={() =>
            qc.invalidateQueries({ queryKey: getListMandateRequestsQueryKey() })
          }
        />
      </div>

      {/* Pending mandate requests */}
      {(pendingRequests.length > 0 || requestsLoading) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Awaiting Producer Confirmation
            </CardTitle>
            <CardDescription>
              Share these tokens with your producers so they can confirm via
              their API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {requestsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              pendingRequests.map((r) => (
                <MandateRequestCard
                  key={r.id}
                  request={r}
                  onCancel={handleCancel}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Active and expired mandates */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (mandates ?? []).length === 0 && pendingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border rounded-xl border-dashed border-border bg-card/50 gap-3">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No active mandates</p>
            <p className="text-sm mt-0.5">
              Generate a request token and share it with a producer to get
              started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Mandates</CardTitle>
                <CardDescription>
                  {active.length} cooperative
                  {active.length !== 1 ? "s" : ""} authorised
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {active.map((m) => (
                  <MandateCard key={m.id} mandate={m} />
                ))}
              </CardContent>
            </Card>
          )}
          {expired.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expired / Revoked</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {expired.map((m) => (
                  <MandateCard key={m.id} mandate={m} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Past mandate requests (collapsed) */}
      {pastRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Past Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {pastRequests.map((r) => (
              <MandateRequestCard
                key={r.id}
                request={r}
                onCancel={handleCancel}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
