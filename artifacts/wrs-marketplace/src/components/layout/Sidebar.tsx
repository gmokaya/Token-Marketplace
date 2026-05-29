import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { LayoutDashboard, Wallet, ShoppingBag, List, BarChart3, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = "" }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // We should ideally fetch the tier from the DB user, but for now we just show everything or based on some heuristic
  // In a real app we'd pass the tier down or use useGetMe

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portfolio", label: "Portfolio", icon: Wallet },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/my-listings", label: "My Listings", icon: List },
    { href: "/orders", label: "Orders", icon: List },
    { href: "/market-stats", label: "Market Stats", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className={`w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col ${className}`}>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary">
          <img src={`${basePath}/logo.svg`} alt="WRS Logo" className="w-8 h-8" />
          <span>WRS Trade</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <div className="text-sm font-medium truncate">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
