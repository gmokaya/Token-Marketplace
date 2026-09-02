import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertTriangle, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  marketName?: string;
  market?: "grain" | "coffee" | "tea";
}

function KybBanner() {
  const { data: user } = useGetMe();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!user) return null;
  if (user.tier === "ADMIN" || user.kybStatus === "VERIFIED") return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[240px] items-start gap-2.5 border border-slate-200 bg-white p-3 shadow-lg shadow-slate-950/10"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-slate-200 bg-slate-50">
        <AlertTriangle className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold leading-4 text-slate-900">Complete your KYC</p>
        <p className="text-[9px] leading-3.5 text-slate-600">
          Finish your verification to unlock full trading, financing, and marketplace features.
        </p>
        <Link
          href="/profile"
          className="mt-1 inline-flex text-[9px] font-bold text-slate-900 underline underline-offset-2 hover:text-slate-600"
        >
          Complete KYC <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-slate-400 transition-colors hover:text-slate-800"
        aria-label="Dismiss KYC reminder"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Layout({ children, marketName = "Grain Market", market = "grain" }: LayoutProps) {
  const { data: me } = useGetMe();
  const isAdmin = me?.tier === "ADMIN";
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("th-sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const handleToggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("th-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f6f6] text-[#25292c]">
      <Show when="signed-in">
        {isAdmin && <AppHeader collapsed={collapsed} onToggle={handleToggle} />}
        <KybBanner />
      </Show>

      <div className="flex flex-1 overflow-hidden">
        <Show when="signed-in">
          <Sidebar
            collapsed={isAdmin ? collapsed : false}
            marketName={marketName}
            market={market}
          />
        </Show>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-none p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
