import { useState, useMemo } from "react";
import { useListSpotListings, useGetMarketSummary } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, SlidersHorizontal, ArrowUpRight, X, Star, BarChart3, Package2, Layers, Factory } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const GRADES = ["AA", "AB", "PB", "C"];
const ORIGINS = ["Ethiopia", "Kenya", "Colombia", "Guatemala", "Brazil", "Rwanda", "Tanzania", "Burundi", "Peru", "Honduras"];
const PROCESSING_METHODS = ["Washed", "Natural", "Honey", "Wet Hulled"];
const CERTIFICATIONS = ["Fair Trade", "Rainforest Alliance", "Organic", "UTZ", "Cup of Excellence", "Bird Friendly", "Direct Trade"];

export default function Market() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [processingFilter, setProcessingFilter] = useState<string>("all");
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: listings, isLoading: isLoadingListings } = useListSpotListings({
    commodityType: "COFFEE",
    status: "ACTIVE",
  } as any);
  const { data: summary, isLoading: isLoadingSummary } = useGetMarketSummary();

  // Client-side filtering over the returned listing set
  const filtered = useMemo(() => {
    const all = listings ?? [];
    return all.filter(listing => {
      const l = listing as any;

      if (search.trim()) {
        const q = search.toLowerCase();
        const searchable = [
          l.grade, l.warehouseCode, l.sellerName, l.commodityType,
          l.giOrigin, l.gradeMark, l.processingMethod,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      if (gradeFilter !== "all" && l.grade !== gradeFilter) return false;
      if (originFilter !== "all" && l.giOrigin !== originFilter) return false;
      if (processingFilter !== "all" && l.processingMethod !== processingFilter) return false;

      if (selectedCerts.length > 0) {
        const lotCerts: string[] = l.certifications ?? [];
        if (!selectedCerts.some(c => lotCerts.includes(c))) return false;
      }

      return true;
    });
  }, [listings, search, gradeFilter, originFilter, processingFilter, selectedCerts]);

  const activeFilterCount = [
    gradeFilter !== "all",
    originFilter !== "all",
    processingFilter !== "all",
    selectedCerts.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setGradeFilter("all");
    setOriginFilter("all");
    setProcessingFilter("all");
    setSelectedCerts([]);
  };

  const toggleCert = (cert: string) => {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Spot Market</h1>
          <p className="text-muted-foreground mt-1">
            Discover and secure premium specialty green coffee directly from origin.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search origins, grades..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filters
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs h-7">
                      <X className="w-3 h-3" /> Clear all
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Grade */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Grade</Label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origin */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Origin</Label>
                  <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger><SelectValue placeholder="All origins" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Origins</SelectItem>
                      {ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Processing */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Processing Method</Label>
                  <Select value={processingFilter} onValueChange={setProcessingFilter}>
                    <SelectTrigger><SelectValue placeholder="All methods" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {PROCESSING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Certifications */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Certifications</Label>
                  <div className="space-y-2.5">
                    {CERTIFICATIONS.map(cert => (
                      <div key={cert} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`cert-${cert}`}
                          checked={selectedCerts.includes(cert)}
                          onCheckedChange={() => toggleCert(cert)}
                        />
                        <label htmlFor={`cert-${cert}`} className="text-sm cursor-pointer">{cert}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                  Show {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {gradeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5">
              Grade: {gradeFilter}
              <button onClick={() => setGradeFilter("all")} className="ml-0.5 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {originFilter !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5">
              Origin: {originFilter}
              <button onClick={() => setOriginFilter("all")} className="ml-0.5 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {processingFilter !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pl-2.5">
              {processingFilter}
              <button onClick={() => setProcessingFilter("all")} className="ml-0.5 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedCerts.map(cert => (
            <Badge key={cert} variant="secondary" className="gap-1.5 pl-2.5">
              {cert}
              <button onClick={() => toggleCert(cert)} className="ml-0.5 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Market Stats Bar */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Avg. Price / MT"
            value={summary?.avgPricePerMt ? `$${Number(summary.avgPricePerMt).toLocaleString()}` : null}
            sub="spot index"
            accent
          />
          <StatCard
            icon={<Layers className="w-4 h-4" />}
            label="Active Listings"
            value={summary?.totalActiveListings != null ? String(summary.totalActiveListings) : null}
            sub="lots available"
          />
          <StatCard
            icon={<Package2 className="w-4 h-4" />}
            label="Total Volume"
            value={summary?.totalVolumeUsd ? `$${Number(summary.totalVolumeUsd).toLocaleString()}` : null}
            sub="settled USD"
          />
          <StatCard
            icon={<Factory className="w-4 h-4" />}
            label="Warehouse Receipts"
            value={summary?.totalEwrs != null ? String(summary.totalEwrs) : null}
            sub="eWRs on-platform"
          />
        </div>
      )}

      {/* Listings Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Live Offers
            {activeFilterCount > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">({filtered.length} matching)</span>
            )}
          </h2>
        </div>
        {isLoadingListings ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card border-dashed">
            <h3 className="text-lg font-medium">
              {activeFilterCount > 0 ? "No lots match your filters" : "No active listings"}
            </h3>
            <p className="text-muted-foreground mt-1">
              {activeFilterCount > 0
                ? "Try adjusting your filters or clearing them."
                : "Check back later for new specialty coffee lots."}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sub: string;
  accent?: boolean;
}) {
  const isEmpty = value === null || value === "$0" || value === "0";
  return (
    <div className={`relative rounded-xl border p-4 flex flex-col gap-2 overflow-hidden ${accent ? "bg-primary text-primary-foreground border-primary/10" : "bg-card"}`}>
      {/* faint background icon */}
      <div className={`absolute -right-2 -bottom-2 opacity-[0.06] scale-[3] ${accent ? "text-white" : "text-foreground"}`}>
        {icon}
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
        <span className={accent ? "text-primary-foreground/70" : "text-muted-foreground"}>{icon}</span>
        {label}
      </div>
      <div className={`text-2xl font-mono font-bold leading-none ${accent ? "text-primary-foreground" : ""}`}>
        {isEmpty ? (
          <span className={`text-base font-medium ${accent ? "text-primary-foreground/40" : "text-muted-foreground/50"}`}>— no data</span>
        ) : (
          value
        )}
      </div>
      <div className={`text-xs ${accent ? "text-primary-foreground/50" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}

function ListingCard({ listing }: { listing: any }) {
  const certifications: string[] = listing.certifications ?? [];
  const cuppingScore = listing.coffeeCuppingScore ?? listing.cuppingScore;
  const processingMethod = listing.processingMethod;
  const origin = listing.giOrigin;

  return (
    <Card className="hover-elevate transition-all flex flex-col group overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-accent/50 to-accent" />
      <div className="p-5 flex-1 flex flex-col">
        {/* Top row: grade badge + price */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
              {listing.grade || "SPECIALTY"}
            </Badge>
            {processingMethod && (
              <Badge variant="secondary" className="text-xs">{processingMethod}</Badge>
            )}
          </div>
          <div className="text-xl font-mono font-bold shrink-0 ml-2">
            ${listing.pricePerMt} <span className="text-xs text-muted-foreground font-sans font-normal">/ MT</span>
          </div>
        </div>

        {/* Title + origin */}
        <h3 className="font-bold group-hover:text-accent transition-colors leading-tight mb-0.5">
          {listing.gradeMark || `${listing.commodityType || "Coffee"} Lot #${listing.ewrId}`}
        </h3>
        {origin && (
          <p className="text-xs text-muted-foreground mb-3">{origin} · Seller: {listing.sellerName}</p>
        )}
        {!origin && (
          <p className="text-xs text-muted-foreground mb-3">Seller: {listing.sellerName}</p>
        )}

        {/* Cupping score */}
        {cuppingScore && (
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-mono font-bold text-amber-600">{cuppingScore} pts</span>
            <span className="text-xs text-muted-foreground">cupping score</span>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg border border-border/50 mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Weight</div>
            <div className="font-mono font-medium">{listing.weightMt} MT</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Warehouse</div>
            <div className="font-medium truncate" title={listing.warehouseCode}>{listing.warehouseCode}</div>
          </div>
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {certifications.slice(0, 3).map(c => (
              <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                {c}
              </Badge>
            ))}
            {certifications.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{certifications.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="mt-auto">
          <Link href={`/lots/${listing.id}`}>
            <Button className="w-full gap-2 group-hover:bg-accent/90 transition-colors">
              View Details <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
