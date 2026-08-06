import { useListCoffeeRfqs } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Inbox, MessageSquare, Package, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

type RfqItem = Record<string, unknown>;

const STATUS_COLORS: Record<string, string> = {
  OPEN:       "bg-blue-100 text-blue-800 border-blue-200",
  QUOTED:     "bg-slate-100 text-slate-800 border-slate-200",
  ACCEPTED:   "bg-green-100 text-green-800 border-green-200",
  REJECTED:   "bg-red-100 text-red-800 border-red-200",
  CLOSED:     "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function RfqCard({ rfq }: { rfq: RfqItem }) {
  const id = rfq.id as number;
  const status = (rfq.status as string) ?? "OPEN";
  const buyerCompany = rfq.buyerCompany as string | undefined;
  const requestedQtyKg = rfq.requestedQuantityKg as number | undefined;
  const requestedPrice = rfq.requestedPriceUsdPerKg as number | undefined;
  const createdAt = rfq.createdAt as string | undefined;
  const preferredProcessing = rfq.message as string | undefined;

  return (
    <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">RFQ #{id}</span>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] ?? STATUS_COLORS.OPEN}`}>
              {status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {buyerCompany ?? "Anonymous buyer"}
            {requestedQtyKg != null && <span> · {(requestedQtyKg / 1000).toFixed(1)} MT</span>}
            {requestedPrice != null && <span> · ${requestedPrice.toFixed(2)}/kg target</span>}
          </p>
          {preferredProcessing && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{preferredProcessing}</p>
          )}
          {createdAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Received {format(new Date(createdAt), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
      <Link href={`/producer/rfqs/${id}`}>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          View <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}

export default function ProducerRfqs() {
  const { data: rfqs, isLoading } = useListCoffeeRfqs();

  const items = (rfqs ?? []) as RfqItem[];
  const open    = items.filter(r => (r.status as string) === "OPEN");
  const others  = items.filter(r => (r.status as string) !== "OPEN");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RFQ Inbox</h1>
          <p className="text-muted-foreground mt-1">Incoming requests for quotation from buyers.</p>
        </div>
        {!isLoading && items.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              {open.length} open
            </Badge>
          </div>
        )}
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
            <p className="font-medium">No RFQs yet</p>
            <p className="text-sm mt-0.5">When buyers request quotes on your lots, they will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Open Requests</CardTitle>
                <CardDescription>Awaiting your response</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {open.map(rfq => <RfqCard key={rfq.id as number} rfq={rfq} />)}
              </CardContent>
            </Card>
          )}
          {others.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Past Requests</CardTitle>
                <CardDescription>Quoted, accepted, or closed</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {others.map(rfq => <RfqCard key={rfq.id as number} rfq={rfq} />)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
