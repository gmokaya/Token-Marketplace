import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ShieldAlert, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

function KybReminder() {
  const { data: user } = useGetMe();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!user) return null;
  if (user.tier === "ADMIN" || user.kybStatus === "VERIFIED") return null;

  return (
    <aside
      className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <ShieldAlert className="h-5 w-5 text-slate-700" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">Complete your KYC</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Finish your verification to unlock full trading, financing, and marketplace features.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-flex items-center text-xs font-semibold text-slate-950 underline underline-offset-4 hover:text-slate-600"
          >
            Complete KYC <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Dismiss KYC reminder"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
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
        <KybReminder />
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
