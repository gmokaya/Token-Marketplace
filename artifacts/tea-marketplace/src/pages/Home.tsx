import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, ArrowRight } from "lucide-react";

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
        <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center mb-8">
          <Leaf className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Mombasa Tea Exchange</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The professional commodity exchange platform for tea traders. 
          Real-time auction access and fixed-price market trading.
        </p>
        <Link href="/sign-in">
          <Button size="lg" className="gap-2 rounded-none">
            Sign In to Terminal <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
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
    if (me.tier === "ENABLER") return <Redirect to="/broker" />;
    if (me.tier === "OFF_TAKER") return <Redirect to="/market" />;
    if (me.tier === "ADMIN") return <Redirect to="/admin/auctions" />;
    if (me.tier === "PRODUCER") return <Redirect to="/mandates" />;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Welcome back, {me?.name || 'Trader'}</h1>
      <p className="text-muted-foreground mb-8">
        Your account is currently set to tier <strong>{me?.tier || 'UNKNOWN'}</strong>. 
        Select a section from the sidebar to continue.
      </p>
    </div>
  );
}