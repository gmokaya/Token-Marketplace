import { useParams } from "wouter";
import { useGetCoffeeShipment, getGetCoffeeShipmentQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isValid } from "date-fns";
import { ArrowLeft, Ship, MapPin, FileText, Clock } from "lucide-react";
import { Link } from "wouter";

// Helper: extract a renderable string from an unknown value
function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function safeDate(val: unknown): string | null {
  const s = str(val);
  if (!s) return null;
  try {
    const d = parseISO(s);
    return isValid(d) ? format(d, "MMM d, yyyy") : null;
  } catch { return null; }
}

type ShipmentRecord = { [key: string]: unknown };

const STATUS_COLORS: Record<string, string> = {
  BOOKED:     "bg-blue-100 text-blue-800 border-blue-200",
  IN_TRANSIT: "bg-slate-100 text-slate-800 border-slate-200",
  AT_PORT:    "bg-slate-100 text-slate-700 border-slate-200",
  DELIVERED:  "bg-green-100 text-green-800 border-green-200",
  CANCELLED:  "bg-red-100 text-red-800 border-red-200",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ProducerShipmentDetail() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const id = parseInt(shipmentId ?? "", 10);

  const { data: shipment, isLoading } = useGetCoffeeShipment(id, {
    query: { enabled: !isNaN(id), queryKey: getGetCoffeeShipmentQueryKey(id) },
  });

  if (isNaN(id)) {
    return <div className="text-center py-12 text-muted-foreground">Invalid shipment ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Shipment not found.</p>
        <Link href="/producer/shipments">
          <Button variant="link" className="mt-2">Back to Shipments</Button>
        </Link>
      </div>
    );
  }

  const s = shipment as ShipmentRecord;
  const status = str(s.status) ?? "BOOKED";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/producer/shipments">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {str(s.shipmentRef) ?? `SHP-${id}`}
            </h1>
            <Badge variant="outline" className={STATUS_COLORS[status] ?? STATUS_COLORS.BOOKED}>
              {status.replace(/_/g, " ")}
            </Badge>
          </div>
          {str(s.buyerCompany) && (
            <p className="text-sm text-muted-foreground mt-0.5">{str(s.buyerCompany)}</p>
          )}
        </div>
      </div>

      {/* Routing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Routing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {str(s.portOfLoading)   && <DetailRow label="Port of Loading"   value={str(s.portOfLoading)!} />}
          {str(s.portOfDischarge) && <DetailRow label="Port of Discharge" value={str(s.portOfDischarge)!} />}
          {str(s.destinationPort) && <DetailRow label="Destination Port"  value={str(s.destinationPort)!} />}
          {str(s.incoterms)       && <DetailRow label="Incoterms"         value={str(s.incoterms)!} />}
          {str(s.buyerCountry)    && <DetailRow label="Buyer Country"     value={str(s.buyerCountry)!} />}
        </CardContent>
      </Card>

      {/* Vessel & Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="w-4 h-4" /> Vessel & Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {str(s.vesselName)      && <DetailRow label="Vessel"        value={str(s.vesselName)!} />}
          {str(s.voyageNumber)    && <DetailRow label="Voyage #"      value={str(s.voyageNumber)!} />}
          {str(s.shippingLine)    && <DetailRow label="Shipping Line" value={str(s.shippingLine)!} />}
          {str(s.blNumber)        && <DetailRow label="B/L Number"    value={str(s.blNumber)!} />}
          {str(s.containerNumber) && <DetailRow label="Container #"   value={str(s.containerNumber)!} />}
          {safeDate(s.etd)        && <DetailRow label="ETD"           value={safeDate(s.etd)!} />}
          {safeDate(s.eta)        && <DetailRow label="ETA"           value={safeDate(s.eta)!} />}
        </CardContent>
      </Card>

      {/* Coffee cargo notes */}
      {str(s.notes) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Cargo Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{str(s.notes)}</p>
          </CardContent>
        </Card>
      )}

      {/* Milestones / documents placeholder */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-5 pb-5 text-center">
          <Clock className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Milestone timeline and export documents</p>
          <p className="text-xs text-muted-foreground mt-1">
            Milestone tracking and document attachments are coming in a follow-up update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
