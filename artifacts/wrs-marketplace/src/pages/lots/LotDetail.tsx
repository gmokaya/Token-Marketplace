import { Link, useLocation, useParams } from "wouter";
import { getGetSpotListingQueryKey, useExecuteOrder, useGetSpotListing } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, CheckCircle2, Factory, Gavel, Loader2, MapPin, Scale, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function LotDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = Number(listingId);
  const { data, isLoading } = useGetSpotListing(id, {
    query: { queryKey: getGetSpotListingQueryKey(id), enabled: Number.isFinite(id) && id > 0 },
  });
  const executeOrder = useExecuteOrder();

  const handleBuy = () => {
    executeOrder.mutate(
      { data: { listingId: id } },
      {
        onSuccess: (order) => {
          toast({ title: "Lot secured", description: "Continue to settlement to complete the transfer." });
          setLocation(`/lots/${order.id}/settlement`);
        },
        onError: (error: any) => {
          toast({
            title: "Purchase failed",
            description: error?.error ?? error?.message ?? "This lot could not be secured.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="mx-auto h-[520px] w-full max-w-5xl" />;
  if (!data) return <div className="py-16 text-center text-muted-foreground">This lot could not be found.</div>;

  const { listing, ewr } = data;
  const available = listing.status === "ACTIVE";
  const pricePerMt = Number(listing.pricePerMt);
  const weightMt = Number(listing.weightMt ?? ewr.weightMt);
  const total = Number(listing.totalValueUsd ?? (pricePerMt * weightMt));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/market">
          <Button variant="ghost" size="icon" aria-label="Back to market"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={available ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : ""}>
            {listing.status}
          </Badge>
          <Badge variant="secondary">{listing.commodityType ?? "GRAIN"}</Badge>
          {listing.grade && <Badge variant="outline">{listing.grade}</Badge>}
          <span className="font-mono text-xs text-muted-foreground">Listing #{listing.id}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{listing.grade ?? "Certified grain"} lot</CardTitle>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Stored at {listing.warehouseCode ?? "certified warehouse"}
                </p>
              </div>
              <Gavel className="h-7 w-7 text-primary/40" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-7 pt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={Scale} label="Weight" value={`${weightMt} MT`} />
              <Metric icon={Factory} label="Warehouse" value={ewr.warehouseCode} />
              <Metric icon={Calendar} label="Harvest" value={ewr.harvestSeason || "—"} />
              <Metric icon={Warehouse} label="Receipt" value={ewr.ewrsReceiptId} mono />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">Grain quality profile</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Detail label="Moisture" value={ewr.moisturePct != null ? `${ewr.moisturePct}%` : "—"} />
                <Detail label="Foreign matter" value={ewr.foreignMatterPct != null ? `${ewr.foreignMatterPct}%` : "—"} />
                <Detail label="Broken grains" value={ewr.brokenGrainsPct != null ? `${ewr.brokenGrainsPct}%` : "—"} />
                <Detail label="Insect damage" value={ewr.insectDamagedGrainsPct != null ? `${ewr.insectDamagedGrainsPct}%` : "—"} />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Backed by a verified Electronic Warehouse Receipt. The receipt remains traceable through settlement.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader className="border-b bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Purchase summary</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Detail label="Price per MT" value={`$${pricePerMt.toLocaleString()}`} />
            <Detail label="Volume" value={`${weightMt} MT`} />
            <div className="h-px bg-border" />
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">Total value</span>
              <span className="font-mono text-lg font-bold text-primary">${total.toLocaleString()}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="h-11 w-full font-semibold" onClick={handleBuy} disabled={!available || executeOrder.isPending}>
              {executeOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {available ? "Secure lot now" : "Currently unavailable"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, mono = false }: { icon: typeof Scale; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-right">{value}</span>
    </div>
  );
}