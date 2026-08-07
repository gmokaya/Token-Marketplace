/**
 * Post-auth smart redirect. Sends each role to their home screen.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading } = useGetMe();

  useEffect(() => {
    if (isLoading || !me) return;
    switch (me.tier) {
      case "ADMIN":
        setLocation("/admin/auctions", { replace: true });
        break;
      case "ENABLER":
        setLocation("/broker", { replace: true });
        break;
      default:
        setLocation("/market", { replace: true });
    }
  }, [me, isLoading, setLocation]);

  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-sm">
      Redirecting…
    </div>
  );
}
