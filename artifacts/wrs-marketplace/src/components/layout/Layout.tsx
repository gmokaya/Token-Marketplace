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
      className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <p className="flex-1 text-xs text-slate-800">
        <strong>Compliance profile incomplete.</strong>{" "}
        Finish your verification to unlock full trading, financing, and marketplace features.{" "}
        <Link
          href="/profile"
          className="font-semibold underline underline-offset-2 hover:text-slate-950"
        >
          Complete KYC →
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 text-slate-500 transition-colors hover:text-slate-800"
        aria-label="Dismiss KYC reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Layout({ children, marketName = "Grain Market", market = "grain" }: LayoutProps) {
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
        <AppHeader collapsed={collapsed} onToggle={handleToggle} />
        <KybBanner />
      </Show>

      <div className="flex flex-1 overflow-hidden">
        <Show when="signed-in">
          <Sidebar collapsed={collapsed} marketName={marketName} market={market} />
        </Show>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
