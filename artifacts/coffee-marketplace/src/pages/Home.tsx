import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Coffee, ArrowRight, BarChart4, Globe2, ShieldCheck } from "lucide-react";
import { useGetMarketSummary } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: marketData, isLoading } = useGetMarketSummary();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Coffee className="w-5 h-5 text-accent" />
          <span>CoffeeXchange</span>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-medium text-muted-foreground hover:text-foreground">Log In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden border-b border-border">
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-plantation.jpg" 
              alt="High altitude coffee plantation" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
          </div>
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 pt-32 pb-40 text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-mono text-sm mb-6">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Live Spot Market & Auctions
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                The standard for <span className="text-accent">specialty</span> green coffee trade.
              </h1>
              <p className="text-lg lg:text-xl text-white/80 mb-8 max-w-xl font-medium">
                A precision B2B exchange connecting East African and Latin American producers directly with specialty roasters, powered by Electronic Warehouse Receipts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/sign-up">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base shadow-lg shadow-accent/20">
                    Open an Account
                  </Button>
                </Link>
                <Link href="/market">
                  <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-12 px-8 text-base backdrop-blur-sm">
                    View Market Data
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live Stats Card */}
            <div className="w-full max-w-md lg:ml-auto">
              <div className="bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary" />
                <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                  <BarChart4 className="w-4 h-4" /> Market Pulse
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">24H Volume</div>
                      {isLoading ? <Skeleton className="h-8 w-24" /> : (
                        <div className="text-2xl font-mono text-foreground">${(marketData?.totalVolumeUsd || 0).toLocaleString()}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Active Listings</div>
                      {isLoading ? <Skeleton className="h-8 w-16" /> : (
                        <div className="text-2xl font-mono text-foreground">{marketData?.totalActiveListings || 0}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Avg Price / MT</div>
                      {isLoading ? <Skeleton className="h-8 w-24" /> : (
                        <div className="text-2xl font-mono text-foreground">${(marketData?.avgPricePerMt || 0).toLocaleString()}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Total eWRs</div>
                      {isLoading ? <Skeleton className="h-8 w-16" /> : (
                        <div className="text-2xl font-mono text-foreground">{marketData?.totalEwrs || 0}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Pitch */}
        <section className="py-24 bg-background">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Built for the entire supply chain.</h2>
              <p className="text-muted-foreground">Whether you're growing, brokering, or roasting, CoffeeXchange provides the infrastructure to trade with confidence.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-card border border-card-border hover-elevate transition-all">
                <Globe2 className="w-10 h-10 text-accent mb-6" />
                <h3 className="text-xl font-bold mb-3">For Producers</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Digitize your inventory into eWRs, list directly on the spot market, and receive prompt settlement. Access financing against your warehoused coffee before it sells.
                </p>
                <ul className="space-y-2 text-sm font-medium mb-8">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Direct market access</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Inventory financing</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Escrow protection</li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-card-border hover-elevate transition-all">
                <ShieldCheck className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">For Brokers</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Manage mandates for multiple cooperatives. Organize live auction sessions for premium micro-lots, and handle settlement logistics through a unified dashboard.
                </p>
                <ul className="space-y-2 text-sm font-medium mb-8">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Multi-client mandates</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Live auction tools</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Automated fees</li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-card-border hover-elevate transition-all">
                <Coffee className="w-10 h-10 text-muted-foreground mb-6" />
                <h3 className="text-xl font-bold mb-3">For Roasters</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Discover traceable, high-cupping-score coffees. Filter by processing method, altitude, and certifications. Secure lots instantly or bid in transparent auctions.
                </p>
                <ul className="space-y-2 text-sm font-medium mb-8">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Verified cupping scores</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> ESG traceability</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Forward contracting</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <Coffee className="w-5 h-5 text-accent" />
            <span>CoffeeXchange</span>
          </div>
          <div className="text-sm text-sidebar-foreground/60">
            &copy; {new Date().getFullYear()} CoffeeXchange Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
