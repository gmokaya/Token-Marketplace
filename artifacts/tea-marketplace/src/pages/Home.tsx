import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  const { user } = useClerk();
  const { data: me, isLoading } = useGetMe({
    query: {
      enabled: !!user,
      queryKey: getGetMeQueryKey(),
    }
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center">
        <Link href="/" className="mb-8">
          <img
            src={`${basePath}/logo-dark.png`}
            alt="TokenHarvest Tea"
            className="h-12 w-auto dark:hidden"
          />
          <img
            src={`${basePath}/logo-white.png`}
            alt="TokenHarvest Tea"
            className="h-12 w-auto hidden dark:block"
          />
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-3">
          TokenHarvest Tea
        </h1>
        <p className="text-xl text-muted-foreground font-medium mb-4">
          Global B2B Digital Tea Marketplace
        </p>
        <p className="text-base text-muted-foreground mb-10 max-w-xl">
          The professional exchange platform where tea factories list and market their teas directly
          to international buyers. Transparent discovery, direct engagement, and streamlined
          cross-border transactions.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button size="lg" className="gap-2">
              Sign In to Terminal <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="lg" variant="outline" className="gap-2">
              Create Account
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center w-full max-w-xl">
          <div>
            <p className="text-2xl font-bold text-primary">150+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Tea Factories</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">40+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Countries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">$2B+</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Annual Volume</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  if (me) {
    if (me.tier === "ENABLER")  return <Redirect to="/broker" />;
    if (me.tier === "OFF_TAKER") return <Redirect to="/market" />;
    if (me.tier === "ADMIN")    return <Redirect to="/admin/auctions" />;
    if (me.tier === "PRODUCER") return <Redirect to="/mandates" />;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Welcome back, {me?.name || "Trader"}</h1>
      <p className="text-muted-foreground mb-8">
        Your account is currently set to tier <strong>{me?.tier || "UNKNOWN"}</strong>.
        Select a section from the sidebar to continue.
      </p>
    </div>
  );
}
