/**
 * Smart post-auth redirect.
 * Reads the current user's tier from the API and sends them to the right landing page.
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
      case "PRODUCER":
        setLocation("/producer", { replace: true });
        break;
      case "ENABLER":
        setLocation("/broker", { replace: true });
        break;
      case "ADMIN":
      case "FINANCIER":
        setLocation("/admin/auctions", { replace: true });
        break;
      default:
        setLocation("/market", { replace: true });
    }
  }, [me, isLoading, setLocation]);

  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Redirecting to your dashboard…
    </div>
  );
}
