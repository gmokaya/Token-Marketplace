import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen bg-background flex flex-col">
          <header className="px-8 py-6 border-b flex justify-between items-center bg-card">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="WRS Logo" className="w-8 h-8" />
              <h1 className="text-xl font-bold text-primary">WRS Marketplace</h1>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" asChild data-testid="link-sign-in">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild data-testid="link-sign-up">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              The precision trading desk for African agriculture.
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
              Trade Electronic Warehouse Receipts (eWRs) securely. 
              Access real-time spot markets for Maize, Rice, Coffee, Tea, and Avocado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg px-8 py-6" asChild data-testid="button-cta-signup">
                <Link href="/sign-up">Join the Marketplace</Link>
              </Button>
            </div>
            
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="p-6 border bg-card rounded-lg">
                <h3 className="font-bold text-lg mb-2">For Producers</h3>
                <p className="text-muted-foreground">Digitize your harvest. List eWRs on the spot market and access financing securely.</p>
              </div>
              <div className="p-6 border bg-card rounded-lg">
                <h3 className="font-bold text-lg mb-2">For Off-Takers</h3>
                <p className="text-muted-foreground">Source verified commodities. Execute buy orders with confidence and transparent pricing.</p>
              </div>
              <div className="p-6 border bg-card rounded-lg">
                <h3 className="font-bold text-lg mb-2">For Financiers</h3>
                <p className="text-muted-foreground">Monitor unencumbered collateral. Mitigate credit risk with real-time portfolio tracking.</p>
              </div>
            </div>
          </main>
        </div>
      </Show>
    </>
  );
}
