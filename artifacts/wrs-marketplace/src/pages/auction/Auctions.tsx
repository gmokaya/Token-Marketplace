import { Link } from "wouter";
import { useListAuctions } from "@workspace/api-client-react";
import { CalendarClock, Gavel, MapPin, Radio, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Auctions() {
  const maize = useListAuctions({ status: "OPEN", commodityType: "MAIZE" });
  const rice = useListAuctions({ status: "OPEN", commodityType: "RICE" });
  const auctions = [...(maize.data ?? []), ...(rice.data ?? [])].sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
  const loading = maize.isLoading || rice.isLoading;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><span className="h-1.5 w-1.5 bg-primary" /> Grain Exchange</div>
        <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
        <p className="mt-1 text-muted-foreground">Open price discovery for verified MAIZE and RICE warehouse receipts.</p>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-56 w-full" />)}</div>
      ) : auctions.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 text-center">
          <Gavel className="h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">No open grain auctions</p>
          <p className="max-w-sm text-sm text-muted-foreground">New auction rooms will appear here when verified receipts are submitted for bidding.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {auctions.map((auction) => (
            <Card key={auction.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="h-1.5 bg-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">Auction #{auction.id}<Badge className="gap-1 bg-red-500/10 text-red-700 hover:bg-red-500/10"><Radio className="h-3 w-3 animate-pulse" /> OPEN</Badge></CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{auction.commodityType} · {auction.grade ?? "Certified grain"}</p>
                  </div>
                  <Gavel className="h-5 w-5 text-primary/50" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info icon={Scale} label="Volume" value={`${auction.weightMt ?? "—"} MT`} />
                  <Info icon={MapPin} label="Warehouse" value={auction.warehouseCode ?? "—"} />
                  <Info icon={Gavel} label="Current high bid" value={auction.currentHighBidUsd != null ? `$${Number(auction.currentHighBidUsd).toLocaleString()}` : "No bids"} />
                  <Info icon={CalendarClock} label="Closes" value={new Date(auction.endAt).toLocaleString()} />
                </div>
                <Link href={`/auctions/${auction.id}`}><Button className="w-full">Enter auction room</Button></Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Scale; label: string; value: string }) {
  return <div className="min-w-0"><div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div><div className="truncate font-mono text-sm font-semibold">{value}</div></div>;
}