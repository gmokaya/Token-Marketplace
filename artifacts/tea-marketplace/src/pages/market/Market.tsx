import { useState } from "react";
import { useListTeaLots, getListTeaLotsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Filter, Search } from "lucide-react";

export default function Market() {
  const [grade, setGrade] = useState("");
  const [origin, setOrigin] = useState("");
  
  const { data: lots, isLoading, isError } = useListTeaLots(
    { listingType: "FIXED_PRICE", status: "LIVE" },
    {
      query: {
        enabled: true,
        queryKey: getListTeaLotsQueryKey({ listingType: "FIXED_PRICE", status: "LIVE" }),
      },
    }
  );

  const fixedPriceLots = lots?.filter(l => l.listingType === "FIXED_PRICE" && l.status === "LIVE") || [];

  const filteredLots = fixedPriceLots.filter(l => 
    (!grade || l.grade.toLowerCase().includes(grade.toLowerCase())) &&
    (!origin || l.giOrigin.toLowerCase().includes(origin.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spot Market</h1>
          <p className="text-muted-foreground">Fixed-price tea lots available for immediate purchase.</p>
        </div>
      </div>

      <Card className="rounded-none shadow-none border-border bg-muted/10">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-64 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grade</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="e.g. BP1" 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="pl-9 rounded-none bg-background"
              />
            </div>
          </div>
          <div className="w-full md:w-64 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin</label>
            <Input 
              placeholder="e.g. Kenya" 
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="rounded-none bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <span>Failed to load market listings. Please try again.</span>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="text-center p-16 border border-dashed">
          <div className="text-muted-foreground text-lg">No spot listings available matching your criteria.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLots.map(lot => (
            <Card key={lot.id} className="rounded-none shadow-none flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="p-5 border-b bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold">{lot.grade}</CardTitle>
                    <div className="text-sm font-medium text-muted-foreground mt-1">{lot.gradeMark}</div>
                  </div>
                  <Badge className="rounded-none">SPOT</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origin</div>
                    <div className="font-semibold">{lot.giOrigin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Weight</div>
                    <div className="font-semibold">{lot.netWeightKg} kg</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</div>
                    <div className="text-2xl font-bold text-primary">
                      ${lot.fixedPricePerKgUsd?.toFixed(2) || lot.reservePriceUsd?.toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/kg</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <Link href={`/lots/${lot.id}`} className="block">
                    <Button className="w-full rounded-none">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}