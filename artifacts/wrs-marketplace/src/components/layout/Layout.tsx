import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertTriangle, X } from "lucide-react";
import "./layout.css";

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
      className="market-kyb-banner"
      role="status"
      aria-live="polite"
    >
      <div className="market-kyb-icon">
        <AlertTriangle className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
      </div>
      <div className="market-kyb-copy">
        <p className="market-kyb-title">Complete your KYC</p>
        <p className="market-kyb-description">
          Finish your verification to unlock full trading, financing, and marketplace features.
        </p>
        <Link
          href="/profile"
          className="market-kyb-link"
        >
          Complete KYC <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="market-kyb-dismiss"
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
    <div className="market-app-shell">
      <Show when="signed-in">
        {isAdmin && <AppHeader collapsed={collapsed} onToggle={handleToggle} />}
        <KybBanner />
      </Show>

      <div className="market-app-body">
        <Show when="signed-in">
          <Sidebar
            collapsed={isAdmin ? collapsed : false}
            marketName={marketName}
            market={market}
          />
        </Show>

        <main className="market-app-main">
          <div className="market-app-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
