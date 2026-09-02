import { useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";

export default function Dashboard() {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;
    if (user.tier === "ADMIN") {
      setLocation("/admin/auctions", { replace: true });
    } else {
      setLocation("/market", { replace: true });
    }
  }, [user, setLocation]);

  if (isLoading || user?.tier === "ADMIN" || user?.tier === "ENABLER") {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Layout>
    );
  }

  // Fallback for any other authenticated role
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Grain Market platform.</p>
      </div>
    </Layout>
  );
}
