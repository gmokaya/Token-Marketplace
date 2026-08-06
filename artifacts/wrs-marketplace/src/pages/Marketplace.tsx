import { useState } from "react";
import { useGetMe, useListSpotListings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COMMODITY_GRADES: Record<string, string[]> = {
  MAIZE: ["Grade 1", "Grade 2"],
  RICE: ["Premium", "Standard"],
  COFFEE: ["AA", "AB", "C"],
  TEA: ["BOPI", "PF1"],
  AVOCADO: ["Export A", "Export B"],
};

const WAREHOUSES = [
  { code: "NBI-WH-01", label: "Nairobi WH-01" },
  { code: "MOM-WH-02", label: "Mombasa WH-02" },
  { code: "KSM-WH-03", label: "Kisumu WH-03" },
  { code: "NKR-WH-04", label: "Nakuru WH-04" },
  { code: "NAI-WH-05", label: "Naivasha WH-05" },
  { code: "ELD-WH-06", label: "Eldoret WH-06" },
];

const getCommodityColor = (type: string) => {
  switch (type) {
    case "MAIZE": return "bg-slate-500/20 text-slate-700 border-slate-500/50";
    case "RICE": return "bg-teal-500/20 text-teal-700 border-teal-500/50";
    case "COFFEE": return "bg-slate-700/20 text-slate-800 border-slate-700/50";
    case "TEA": return "bg-green-600/20 text-green-800 border-green-600/50";
    case "AVOCADO": return "bg-emerald-500/20 text-emerald-700 border-emerald-500/50";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Marketplace() {
  const { data: user } = useGetMe();
  const [commodityFilter, setCommodityFilter] = useState<string>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("ALL");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const gradeOptions = commodityFilter !== "ALL" ? (COMMODITY_GRADES[commodityFilter] ?? []) : [];

  const { data: listings, isLoading } = useListSpotListings({
    commodityType: commodityFilter === "ALL" ? undefined : (commodityFilter as any),
    grade: gradeFilter === "ALL" ? undefined : gradeFilter,
    warehouseCode: warehouseFilter === "ALL" ? undefined : warehouseFilter,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    status: "ACTIVE" as any,
  });

  if (user?.tier === "PRODUCER") {
    return (
      <Layout>
        <div className="text-center p-12 text-muted-foreground">
          Producers list on the market rather than buy. Please use <Link href="/portfolio" className="text-primary underline">My Portfolio</Link> to list your eWRs.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Spot Marketplace</h1>
          <div className="text-sm text-muted-foreground">
            {listings?.length ?? 0} active listing{listings?.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commodity</Label>
            <Select value={commodityFilter} onValueChange={(v) => { setCommodityFilter(v); setGradeFilter("ALL"); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Commodities</SelectItem>
                <SelectItem value="MAIZE">Maize</SelectItem>
                <SelectItem value="RICE">Rice</SelectItem>
                <SelectItem value="COFFEE">Coffee</SelectItem>
                <SelectItem value="TEA">Tea</SelectItem>
                <SelectItem value="AVOCADO">Avocado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grade</Label>
            <Select value={gradeFilter} onValueChange={setGradeFilter} disabled={gradeOptions.length === 0}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Grades</SelectItem>
                {gradeOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</Label>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Warehouses</SelectItem>
                {WAREHOUSES.map(w => <SelectItem key={w.code} value={w.code}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min Price / MT</Label>
            <Input
              placeholder="e.g. 100"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              type="number"
              min={0}
              className="bg-background"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Price / MT</Label>
            <Input
              placeholder="e.g. 5000"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              type="number"
              min={0}
              className="bg-background"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings?.map((listing) => (
              <Card key={listing.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCommodityColor(listing.commodityType || "")}>
                      {listing.commodityType}
                    </Badge>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">${listing.pricePerMt}/MT</div>
                      <div className="text-xs text-muted-foreground">Total: ${listing.totalValueUsd?.toLocaleString()}</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{listing.weightMt} MT · Grade {listing.grade}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seller</span>
                      <span className="font-medium truncate max-w-[130px]">{listing.sellerName || `ID: ${listing.sellerId}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warehouse</span>
                      <span className="font-medium">{listing.warehouseCode}</span>
                    </div>
                    {listing.moisturePct && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moisture</span>
                        <span className="font-medium">{listing.moisturePct}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Season</span>
                      <span className="font-medium">{listing.harvestSeason}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline" data-testid={`button-view-listing-${listing.id}`}>
                    <Link href={`/marketplace/${listing.id}`}>View &amp; Buy</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {listings?.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed text-muted-foreground rounded-lg">
                No active listings match your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
