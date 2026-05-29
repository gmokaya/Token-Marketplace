import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { Show } from "@clerk/react";

interface LayoutProps {
  children: ReactNode;
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
