import { Moon, Sun, PanelLeftClose, PanelLeftOpen, LogOut, Home } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { formatTier } from "@/lib/formatTier";

interface AppHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const nowDark = !html.classList.contains("dark");
    html.classList.toggle("dark", nowDark);
    localStorage.setItem("theme", nowDark ? "dark" : "light");
    setDark(nowDark);
  };

  return { dark, toggle };
}

export function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: dbUser } = useGetMe();
  const { dark, toggle: toggleDark } = useDarkMode();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ?? "?";

  const tierLabel = formatTier(dbUser?.tier);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 pl-4 pr-3 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-1">
        <Link href="/" className="flex items-center">
          <span className="tokenharvest-wordmark text-2xl text-foreground shrink-0">
            TokenHarvest
          </span>
        </Link>

        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <Link href="/">
          <button
            title="View public site"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View site</span>
          </button>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0"
            title={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? ""}
          >
            {initials}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold leading-none text-foreground truncate max-w-[120px]">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
            </p>
            {tierLabel && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{tierLabel}</p>
            )}
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
