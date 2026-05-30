import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, Wallet, ShoppingBag, List, BarChart3,
  User, ClipboardList, Package, Gavel, FileText, Landmark,
  TrendingUp, ShieldCheck, PackagePlus, Plug, Users, LayoutTemplate,
} from "lucide-react";
import { formatTier } from "@/lib/formatTier";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [location] = useLocation();
  const { data: dbUser } = useGetMe();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const tier = dbUser?.tier;

  const allNavItems = [
    { href: "/dashboard",        label: "Dashboard",        icon: LayoutDashboard, tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER"] },
    { href: "/intake",           label: "WMS Intake",       icon: PackagePlus,     tiers: ["PRODUCER","ENABLER"] },
    { href: "/portfolio",        label: "My Portfolio",     icon: Wallet,          tiers: ["PRODUCER"] },
    { href: "/my-listings",      label: "My Listings",      icon: Package,         tiers: ["PRODUCER"] },
    { href: "/auctions",         label: "Auctions",         icon: Gavel,           tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER"] },
    { href: "/forwards",         label: "Forward Contracts",icon: FileText,        tiers: ["PRODUCER","OFF_TAKER","ENABLER"] },
    { href: "/marketplace",      label: "Marketplace",      icon: ShoppingBag,     tiers: ["OFF_TAKER","ENABLER","FINANCIER"] },
    { href: "/orders",           label: "My Orders",        icon: ClipboardList,   tiers: ["OFF_TAKER"] },
    { href: "/financing",        label: "Financing",        icon: Landmark,        tiers: ["PRODUCER","FINANCIER","ENABLER"] },
    { href: "/market-stats",     label: "Market Stats",     icon: BarChart3,       tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER"] },
    { href: "/admin/users",      label: "User Management",  icon: Users,           tiers: ["ENABLER","FINANCIER"] },
    { href: "/admin/earnings",   label: "Platform Earnings",icon: TrendingUp,      tiers: ["ENABLER","FINANCIER"] },
    { href: "/admin/audit",      label: "Audit Log",        icon: ShieldCheck,     tiers: ["ENABLER","FINANCIER"] },
    { href: "/admin/ewr-api",    label: "API Integration",  icon: Plug,            tiers: ["ENABLER","FINANCIER"] },
    { href: "/admin/homepage",   label: "Homepage Content", icon: LayoutTemplate,  tiers: ["ENABLER","FINANCIER"] },
    { href: "/profile",          label: "Profile",          icon: User,            tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER"] },
  ];

  const navItems = tier
    ? allNavItems.filter(item => item.tiers.includes(tier))
    : allNavItems;

  return (
    <aside
      className={`
        flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0
        transition-all duration-200 ease-in-out overflow-hidden
        ${collapsed ? "w-[72px]" : "w-60"}
      `}
    >
      {!collapsed && tier && (
        <div className="px-4 pt-3 pb-1">
          <span className="inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sidebar-accent/60 text-sidebar-accent-foreground border border-sidebar-border">
            {formatTier(tier)}
          </span>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pt-3 pb-1">
          <img src={`${basePath}/logo-white.png`} alt="TokenHarvest" className="h-6 w-auto opacity-80" />
        </div>
      )}

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`
                flex items-center gap-3 rounded-md transition-colors
                ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}
                ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/75 hover:text-sidebar-foreground"
                }
              `}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
