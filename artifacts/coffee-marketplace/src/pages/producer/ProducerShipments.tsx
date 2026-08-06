import { useListCoffeeShipments } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isValid } from "date-fns";
import { Ship, Package, ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "wouter";

type ShipmentItem = Record<string, unknown>;

const STATUS_COLORS: Record<string, string> = {
  BOOKED:     "bg-blue-100 text-blue-800 border-blue-200",
  IN_TRANSIT: "bg-slate-100 text-slate-800 border-slate-200",
  AT_PORT:    "bg-slate-100 text-slate-700 border-slate-200",
  DELIVERED:  "bg-green-100 text-green-800 border-green-200",
  CANCELLED:  "bg-red-100 text-red-800 border-red-200",
};

function safeDate(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  try {
    const d = parseISO(val);
    return isValid(d) ? format(d, "MMM d, yyyy") : null;
  } catch {
    return null;
  }
}

function ShipmentCard({ shipment }: { shipment: ShipmentItem }) {
  const id = shipment.id as number;
  const ref = shipment.shipmentRef as string | undefined;
  const status = (shipment.status as string) ?? "BOOKED";
  const pol = shipment.portOfLoading as string | undefined;
  const pod = shipment.portOfDischarge as string | undefined;
  const buyerCompany = shipment.buyerCompany as string | undefined;
  const eta = safeDate(shipment.eta);
  const etd = safeDate(shipment.etd);
  const blNumber = shipment.blNumber as string | undefined;

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Ship className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm font-mono">{ref ?? `SHP-${id}`}</span>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] ?? STATUS_COLORS.BOOKED}`}>
              {status.replace(/_/g, " ")}
            </Badge>
          </div>
          {(pol || pod) && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {pol ?? "—"} → {pod ?? "—"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {buyerCompany && <span>{buyerCompany}</span>}
            {etd && <span> · ETD {etd}</span>}
            {eta && <span> · ETA {eta}</span>}
            {blNumber && <span> · B/L {blNumber}</span>}
          </p>
        </div>
      </div>
      <Link href={`/producer/shipments/${id}`}>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          Details <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}

export default function ProducerShipments() {
  const { data: shipments, isLoading } = useListCoffeeShipments();

  const items = (shipments ?? []) as ShipmentItem[];
  const active    = items.filter(s => !["DELIVERED","CANCELLED"].includes((s.status as string) ?? ""));
  const completed = items.filter(s => ["DELIVERED","CANCELLED"].includes((s.status as string) ?? ""));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
        <p className="text-muted-foreground mt-1">Track outgoing deliveries for settled lots.</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 border rounded-xl border-dashed border-border bg-card/50 gap-3">
          <Package className="w-8 h-8 text-muted-foreground/40" />
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No shipments yet</p>
            <p className="text-sm mt-0.5">Completed orders will generate shipment tracking records here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Shipments</CardTitle>
                <CardDescription>Currently in transit or at port</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {active.map(s => <ShipmentCard key={s.id as number} shipment={s} />)}
              </CardContent>
            </Card>
          )}
          {completed.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Completed</CardTitle>
                <CardDescription>Delivered or cancelled</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {completed.map(s => <ShipmentCard key={s.id as number} shipment={s} />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
