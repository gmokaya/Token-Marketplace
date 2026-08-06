import { useGetMyMandates } from "@workspace/api-client-react";
import { BrokerMandate } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ShieldCheck, Plus, CalendarClock, Building2 } from "lucide-react";
import { Link } from "wouter";

function MandateCard({ mandate }: { mandate: BrokerMandate }) {
  const isActive = !mandate.revoked && (!mandate.validTo || new Date(mandate.validTo) > new Date());

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{mandate.ownerName ?? `Producer #${mandate.ownerId}`}</span>
            <Badge
              variant="outline"
              className={`text-xs ${isActive
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"}`}
            >
              {mandate.revoked ? "Revoked" : isActive ? "Active" : "Expired"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">{mandate.commodityType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Valid from {format(new Date(mandate.validFrom), "MMM d, yyyy")}
            {mandate.validTo && ` · expires ${format(new Date(mandate.validTo), "MMM d, yyyy")}`}
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

export default function BrokerMandates() {
  const { data: mandates, isLoading } = useGetMyMandates();

  const active  = (mandates ?? []).filter(m => !m.revoked && (!m.validTo || new Date(m.validTo) > new Date()));
  const expired = (mandates ?? []).filter(m => m.revoked || (m.validTo && new Date(m.validTo) <= new Date()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mandate Holders</h1>
        <p className="text-muted-foreground mt-1">
          Producer cooperatives that have authorized you to trade on their behalf.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (mandates ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border rounded-xl border-dashed border-border bg-card/50 gap-3">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No active mandates</p>
            <p className="text-sm mt-0.5">Producers will appear here once they grant you a trading mandate.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Mandates</CardTitle>
                <CardDescription>{active.length} cooperative{active.length !== 1 ? "s" : ""} authorised</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {active.map(m => <MandateCard key={m.id} mandate={m} />)}
              </CardContent>
            </Card>
          )}
          {expired.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expired / Revoked</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {expired.map(m => <MandateCard key={m.id} mandate={m} />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
