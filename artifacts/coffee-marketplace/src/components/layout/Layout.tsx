import { ReactNode } from "react";
import { useState } from "react";
import { Show } from "@clerk/react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import "./layout.css";

export function Layout({ children }: { children: ReactNode }) {
  const { data: me } = useGetMe();
  const isAdmin = me?.tier === "ADMIN";
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("th-coffee-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const handleToggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("th-coffee-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="market-app-shell market-app-shell--coffee">
      <Show when="signed-in">
        {isAdmin && <AppHeader collapsed={collapsed} onToggle={handleToggle} />}
        <KybBanner />
      </Show>

      <div className="market-app-body">
        <Show when="signed-in">
          <Sidebar collapsed={isAdmin ? collapsed : false} />
        </Show>
        <main className="market-app-main">
          <div className="market-app-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

function KybBanner() {
  const { data: user } = useGetMe();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !user || user.tier === "ADMIN" || user.kybStatus === "VERIFIED") {
    return null;
  }

  return (
    <div className="market-kyb-banner" role="status" aria-live="polite">
      <div className="market-kyb-icon">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="market-kyb-copy">
        <p className="market-kyb-title">Complete your KYC</p>
        <p className="market-kyb-description">
          Finish your verification to unlock full trading, financing, and marketplace features.
        </p>
        <Link href="/profile" className="market-kyb-link">
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
