import { Moon, Sun, PanelLeftClose, PanelLeftOpen, LogOut, Home } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
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
    const saved = localStorage.getItem("th-theme");
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
    localStorage.setItem("th-theme", nowDark ? "dark" : "light");
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
    <header className="market-app-header sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-[#dfe3e3] bg-[#fbfcfc] pl-4 pr-3 text-[#25292c]">
      <div className="flex items-center gap-1">
        <Link href="/" className="flex items-center">
          <span className="tokenharvest-wordmark shrink-0 text-2xl text-[#25292c]">
            TokenHarvest
          </span>
        </Link>

        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="flex h-8 w-8 items-center justify-center text-[#7b8588] transition-colors hover:bg-[#eef1f1] hover:text-[#25292c]"
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <Link href="/">
          <button
            title="View public site"
            className="flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium text-[#7b8588] transition-colors hover:bg-[#eef1f1] hover:text-[#25292c]"
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
          className="flex h-8 w-8 items-center justify-center text-[#7b8588] transition-colors hover:bg-[#eef1f1] hover:text-[#25292c]"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="mx-1 h-5 w-px bg-[#dfe3e3]" />

        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#25292c] text-xs font-bold text-white"
            title={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? ""}
          >
            {initials}
          </div>
          <div className="hidden sm:block text-right">
            <p className="max-w-[120px] truncate text-xs font-semibold leading-none text-[#25292c]">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
            </p>
            {tierLabel && (
              <p className="mt-0.5 text-[10px] leading-none text-[#7b8588]">{tierLabel}</p>
            )}
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center text-[#7b8588] transition-colors hover:bg-[#eef1f1] hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
