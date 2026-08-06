import { useParams } from "wouter";
import { useGetCoffeeRfq, getGetCoffeeRfqQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, MessageSquare, Package, CalendarDays } from "lucide-react";
import { Link } from "wouter";

// Helper: extract a renderable string from an unknown value
function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

type RfqRecord = { [key: string]: unknown };

const STATUS_COLORS: Record<string, string> = {
  OPEN:     "bg-blue-100 text-blue-800 border-blue-200",
  QUOTED:   "bg-slate-100 text-slate-800 border-slate-200",
  ACCEPTED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CLOSED:   "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ProducerRfqDetail() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const id = parseInt(rfqId ?? "", 10);

  const { data: rfq, isLoading } = useGetCoffeeRfq(id, {
    query: { enabled: !isNaN(id), queryKey: getGetCoffeeRfqQueryKey(id) },
  });

  if (isNaN(id)) {
    return <div className="text-center py-12 text-muted-foreground">Invalid RFQ ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>RFQ not found.</p>
        <Link href="/producer/rfqs">
          <Button variant="link" className="mt-2">Back to RFQ Inbox</Button>
        </Link>
      </div>
    );
  }

  const r = rfq as RfqRecord;
  const status = str(r.status) ?? "OPEN";
  const rfqId_ = r.id as number;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/producer/rfqs">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">RFQ #{rfqId_}</h1>
            <Badge variant="outline" className={STATUS_COLORS[status] ?? STATUS_COLORS.OPEN}>
              {status}
            </Badge>
          </div>
          {str(r.buyerCompany) && (
            <p className="text-sm text-muted-foreground mt-0.5">{str(r.buyerCompany)}</p>
          )}
        </div>
      </div>

      {/* Buyer Request */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Request Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {str(r.buyerEmail) && <DetailRow label="Buyer Email" value={str(r.buyerEmail)!} />}
          {r.requestedQuantityKg != null && (
            <DetailRow
              label="Requested Quantity"
              value={`${((r.requestedQuantityKg as number) / 1000).toFixed(2)} MT`}
            />
          )}
          {r.requestedPriceUsdPerKg != null && (
            <DetailRow
              label="Target Price"
              value={`$${(r.requestedPriceUsdPerKg as number).toFixed(2)}/kg`}
            />
          )}
          {str(r.preferredIncoterms) && (
            <DetailRow label="Preferred Incoterms" value={str(r.preferredIncoterms)!} />
          )}
          {str(r.requestedShipmentDate) && (
            <DetailRow label="Requested Shipment" value={str(r.requestedShipmentDate)!} />
          )}
          {str(r.createdAt) && (
            <DetailRow
              label="Received"
              value={format(new Date(str(r.createdAt)!), "MMM d, yyyy HH:mm")}
            />
          )}
        </CardContent>
      </Card>

      {/* Coffee preferences */}
      {(str(r.preferredProcessingMethod) || str(r.preferredVarietal) || r.targetCuppingScore != null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Coffee Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {str(r.preferredProcessingMethod) && (
              <DetailRow label="Processing Method" value={str(r.preferredProcessingMethod)!} />
            )}
            {str(r.preferredVarietal) && (
              <DetailRow label="Varietal" value={str(r.preferredVarietal)!} />
            )}
            {r.targetCuppingScore != null && (
              <DetailRow label="Target Cupping Score" value={String(r.targetCuppingScore)} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Buyer message */}
      {str(r.message) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Buyer Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{str(r.message)}</p>
          </CardContent>
        </Card>
      )}

      {/* Messaging placeholder */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 pb-5 text-center">
          <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Inline messaging and quotation submission</p>
          <p className="text-xs text-muted-foreground mt-1">
            Full thread view and response tools are coming in a follow-up update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
