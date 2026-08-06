import { useListCoffeeLots, CoffeeLot } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Plus, Coffee, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

export default function ProducerProducts() {
  const { data: lots, isLoading } = useListCoffeeLots();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lot Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage your green coffee lots across the marketplace.</p>
        </div>
        <Link href="/producer/lots/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create New Lot
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Listings</CardTitle>
          <CardDescription>Coffee lots currently in draft, listed on the spot market, or sold.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !lots || lots.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No lots found</h3>
              <p className="text-muted-foreground text-sm mt-1">Create a lot from an existing eWR to start trading.</p>
              <Link href="/producer/lots/new">
                <Button variant="outline" className="mt-4">Create your first lot</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lots.map((lot) => (
                <LotCard key={lot.id} lot={lot} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LotCard({ lot }: { lot: CoffeeLot }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'SOLD': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'CATALOGUED': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'DISPATCHED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const netWeightMt = lot.netWeightKg / 1000;

  return (
    <div className="group rounded-xl border border-border bg-card p-5 hover-elevate transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <Badge variant="outline" className={getStatusColor(lot.status)}>
          {lot.status}
        </Badge>
        <div className="font-mono text-lg font-bold">
          {lot.reservePriceUsd != null ? `$${lot.reservePriceUsd}` : lot.fixedPricePerKgUsd != null ? `$${lot.fixedPricePerKgUsd}/kg` : '-'}
          {lot.reservePriceUsd != null && <span className="text-xs text-muted-foreground font-sans font-normal"> / kg</span>}
        </div>
      </div>

      <h3 className="font-bold text-lg mb-0.5 group-hover:text-accent transition-colors">
        {lot.gradeMark}
      </h3>
      <p className="text-sm text-muted-foreground mb-1">
        {lot.grade} · {lot.giOrigin}
      </p>
      {lot.processingMethod && (
        <p className="text-xs text-muted-foreground mb-3">{lot.processingMethod}{lot.varietal ? ` · ${lot.varietal}` : ''}</p>
      )}

      {lot.cuppingRemarks && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {lot.cuppingRemarks}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4 text-sm bg-muted/50 p-3 rounded-lg">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Net Weight</div>
          <div className="font-mono font-medium">{netWeightMt.toFixed(2)} MT</div>
        </div>
        {lot.coffeeBeanSize && (
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Bean Size</div>
            <div className="font-medium">{lot.coffeeBeanSize}</div>
          </div>
        )}
        {lot.coffeeCuppingScore != null && (
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Cupping Score</div>
            <div className="font-medium">{lot.coffeeCuppingScore}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Listed On</div>
          <div className="font-medium">{format(new Date(lot.createdAt), 'MMM d, yyyy')}</div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border flex justify-end gap-2">
        {['DRAFT', 'CATALOGUED'].includes(lot.status) && (
          <Link href={`/producer/lots/${lot.id}/edit`}>
            <Button variant="outline" size="sm">Edit Lot</Button>
          </Link>
        )}
        <Link href={`/lots/${lot.id}`}>
          <Button size="sm" className="gap-1">View Details <ArrowUpRight className="w-3 h-3" /></Button>
        </Link>
      </div>
    </div>
  );
}
