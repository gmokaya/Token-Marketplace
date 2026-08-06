import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertTriangle, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

function KybBanner() {
  const { data: user } = useGetMe();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!user) return null;
  if ((user as any).tier === "ADMIN") return null;
  const status = (user as any).onboardingStatus ?? "PENDING_KYB_APPROVAL";
  if (status !== "PENDING_KYB_APPROVAL") return null;

  return (
    <div className="flex items-center gap-3 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
      <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
      <p className="text-xs text-slate-800 flex-1">
        <strong>Compliance profile incomplete.</strong>{" "}
        Submit your KYB details to unlock full trading access.{" "}
        <Link href="/profile" className="underline underline-offset-2 font-semibold hover:text-slate-950">
          Complete now →
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-500 hover:text-slate-800 transition-colors ml-2"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const handleToggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Show when="signed-in">
        <AppHeader collapsed={collapsed} onToggle={handleToggle} />
        <KybBanner />
      </Show>

      <div className="flex flex-1 overflow-hidden">
        <Show when="signed-in">
          <Sidebar collapsed={collapsed} />
        </Show>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
