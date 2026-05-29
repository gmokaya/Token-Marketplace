import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { LayoutDashboard, Wallet, ShoppingBag, List, BarChart3, User, LogOut, ClipboardList, Package, Gavel, FileText, Landmark, TrendingUp, ShieldCheck, PackagePlus, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar({ className = "" }: { className?: string }) {
  const [location] = useLocation();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { data: dbUser } = useGetMe();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const tier = dbUser?.tier;

  const allNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tiers: ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"] },
    { href: "/intake", label: "WMS Intake", icon: PackagePlus, tiers: ["PRODUCER", "ENABLER"] },
    { href: "/portfolio", label: "My Portfolio", icon: Wallet, tiers: ["PRODUCER"] },
    { href: "/my-listings", label: "My Listings", icon: Package, tiers: ["PRODUCER"] },
    { href: "/auctions", label: "Auctions", icon: Gavel, tiers: ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"] },
    { href: "/forwards", label: "Forward Contracts", icon: FileText, tiers: ["PRODUCER", "OFF_TAKER", "ENABLER"] },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag, tiers: ["OFF_TAKER", "ENABLER", "FINANCIER"] },
    { href: "/orders", label: "My Orders", icon: ClipboardList, tiers: ["OFF_TAKER"] },
    { href: "/financing", label: "Financing", icon: Landmark, tiers: ["PRODUCER", "FINANCIER", "ENABLER"] },
    { href: "/admin/earnings", label: "Platform Earnings", icon: TrendingUp, tiers: ["ENABLER", "FINANCIER"] },
    { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck, tiers: ["ENABLER", "FINANCIER"] },
    { href: "/admin/ewr-api", label: "API Integration", icon: Plug, tiers: ["ENABLER", "FINANCIER"] },
    { href: "/market-stats", label: "Market Stats", icon: BarChart3, tiers: ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"] },
    { href: "/profile", label: "Profile", icon: User, tiers: ["PRODUCER", "OFF_TAKER", "ENABLER", "FINANCIER"] },
  ];

  const navItems = tier
    ? allNavItems.filter(item => item.tiers.includes(tier))
    : allNavItems;

  return (
    <aside className={`w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col ${className}`}>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary">
          <img src={`${basePath}/logo.svg`} alt="WRS Logo" className="w-8 h-8" />
          <span>WRS Trade</span>
        </Link>
      </div>

      {tier && (
        <div className="px-6 pb-3">
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {tier.replace("_", " ")}
          </span>
        </div>
      )}

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
          <div className="text-sm font-medium truncate">{clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress}</div>
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
