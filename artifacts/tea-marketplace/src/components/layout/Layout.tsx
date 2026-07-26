import { ReactNode, useState } from "react";
import { Show } from "@clerk/react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("th-tea-sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("th-tea-sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
      <Show when="signed-in">
        <AppHeader collapsed={collapsed} onToggle={handleToggle} />
      </Show>

      <div className="flex flex-1 overflow-hidden">
        <Show when="signed-in">
          <Sidebar collapsed={collapsed} />
        </Show>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto p-6 max-w-[1400px] min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
