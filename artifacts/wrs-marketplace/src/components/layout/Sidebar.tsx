import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, Wallet, ShoppingBag, List, BarChart3,
  User, ClipboardList, Package, Gavel, FileText, Landmark,
  TrendingUp, ShieldCheck, PackagePlus, Plug, Users, LayoutTemplate,
  Building2, Layers, Wheat, Archive, Shield,
} from "lucide-react";
import { formatTier } from "@/lib/formatTier";

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  tiers: string[];
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    heading: "Platform Admin",
    items: [
      { href: "/dashboard",      label: "Dashboard",        icon: LayoutDashboard, tiers: ["ADMIN"] },
      { href: "/admin/users",    label: "User Management",  icon: Users,           tiers: ["ADMIN"] },
      { href: "/admin/earnings", label: "Platform Earnings",icon: TrendingUp,      tiers: ["ADMIN"] },
      { href: "/admin/audit",    label: "Audit Log",        icon: ShieldCheck,     tiers: ["ADMIN"] },
      { href: "/admin/ewr-api",  label: "API Integration",  icon: Plug,            tiers: ["ADMIN"] },
      { href: "/admin/homepage", label: "Homepage Content", icon: LayoutTemplate,  tiers: ["ADMIN"] },
    ],
  },
  {
    heading: "Marketplace",
    items: [
      { href: "/marketplace",    label: "Marketplace",      icon: ShoppingBag,     tiers: ["ADMIN"] },
      { href: "/auctions",       label: "Auctions",         icon: Gavel,           tiers: ["ADMIN"] },
      { href: "/forwards",       label: "Forward Contracts",icon: FileText,        tiers: ["ADMIN"] },
      { href: "/market-stats",   label: "Market Stats",     icon: BarChart3,       tiers: ["ADMIN"] },
    ],
  },
  {
    heading: "Trading",
    items: [
      { href: "/portfolio",      label: "Portfolio",        icon: Wallet,          tiers: ["ADMIN"] },
      { href: "/my-listings",    label: "My Listings",      icon: Package,         tiers: ["ADMIN"] },
      { href: "/orders",         label: "Orders",           icon: ClipboardList,   tiers: ["ADMIN"] },
      { href: "/intake",         label: "WMS Intake",       icon: PackagePlus,     tiers: ["ADMIN"] },
    ],
  },
  {
    heading: "Cooperative",
    items: [
      { href: "/coop",           label: "Coop Dashboard",   icon: Building2,       tiers: ["ADMIN"] },
      { href: "/coop/members",   label: "Member Ledger",    icon: Users,           tiers: ["ADMIN"] },
      { href: "/coop/intake",    label: "Intake Log",       icon: Wheat,           tiers: ["ADMIN"] },
      { href: "/coop/macro-lots",label: "Macro Lots",       icon: Layers,          tiers: ["ADMIN"] },
      { href: "/coop/inventory", label: "e-WR Inventory",   icon: Archive,         tiers: ["ADMIN"] },
    ],
  },
  {
    heading: "Financing",
    items: [
      { href: "/financing",      label: "Financing",        icon: Landmark,        tiers: ["ADMIN"] },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",        label: "Dashboard",        icon: LayoutDashboard, tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER"] },
  { href: "/coop",             label: "Coop Dashboard",   icon: Building2,       tiers: ["COOPERATIVE"] },
  { href: "/intake",           label: "WMS Intake",       icon: PackagePlus,     tiers: ["PRODUCER","ENABLER"] },
  { href: "/portfolio",        label: "My Portfolio",     icon: Wallet,          tiers: ["PRODUCER"] },
  { href: "/my-listings",      label: "My Listings",      icon: Package,         tiers: ["PRODUCER"] },
  { href: "/coop/members",     label: "Member Ledger",    icon: Users,           tiers: ["COOPERATIVE"] },
  { href: "/coop/intake",      label: "Intake Log",       icon: Wheat,           tiers: ["COOPERATIVE"] },
  { href: "/coop/macro-lots",  label: "Macro Lots",       icon: Layers,          tiers: ["COOPERATIVE"] },
  { href: "/coop/inventory",   label: "e-WR Inventory",   icon: Archive,         tiers: ["COOPERATIVE"] },
  { href: "/auctions",         label: "Auctions",         icon: Gavel,           tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER","COOPERATIVE"] },
  { href: "/forwards",         label: "Forward Contracts",icon: FileText,        tiers: ["PRODUCER","OFF_TAKER","ENABLER"] },
  { href: "/marketplace",      label: "Marketplace",      icon: ShoppingBag,     tiers: ["OFF_TAKER","ENABLER","FINANCIER"] },
  { href: "/orders",           label: "My Orders",        icon: ClipboardList,   tiers: ["OFF_TAKER"] },
  { href: "/financing",        label: "Financing",        icon: Landmark,        tiers: ["PRODUCER","FINANCIER","ENABLER"] },
  { href: "/market-stats",     label: "Market Stats",     icon: BarChart3,       tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER","COOPERATIVE"] },
  { href: "/admin/users",      label: "User Management",  icon: Users,           tiers: ["ENABLER","FINANCIER"] },
  { href: "/admin/earnings",   label: "Platform Earnings",icon: TrendingUp,      tiers: ["ENABLER","FINANCIER"] },
  { href: "/admin/audit",      label: "Audit Log",        icon: ShieldCheck,     tiers: ["ENABLER","FINANCIER"] },
  { href: "/admin/ewr-api",    label: "API Integration",  icon: Plug,            tiers: ["ENABLER","FINANCIER"] },
  { href: "/admin/homepage",   label: "Homepage Content", icon: LayoutTemplate,  tiers: ["ENABLER","FINANCIER"] },
  { href: "/profile",          label: "Profile",          icon: User,            tiers: ["PRODUCER","OFF_TAKER","ENABLER","FINANCIER","COOPERATIVE","ADMIN"] },
];

function NavLink({ item, collapsed, location }: { item: NavItem; collapsed: boolean; location: string }) {
  const isActive = location === item.href || location.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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
      {!collapsed && <span className="text-sm truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [location] = useLocation();
  const { data: dbUser } = useGetMe();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const tier = dbUser?.tier;
  const isAdmin = tier === "ADMIN";

  return (
    <aside
      className={`
        flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0
        transition-all duration-200 ease-in-out overflow-hidden
        ${collapsed ? "w-[72px]" : "w-60"}
      `}
    >
      {!collapsed && tier && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          {isAdmin && <Shield className="w-3 h-3 text-primary shrink-0" />}
          <span className={`inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border
            ${isAdmin
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-sidebar-accent/60 text-sidebar-accent-foreground border-sidebar-border"
            }`}>
            {isAdmin ? "Superadmin" : formatTier(tier)}
          </span>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pt-3 pb-1">
          <img src={`${basePath}/logo-white.png`} alt="TokenHarvest" className="h-6 w-auto opacity-80" />
        </div>
      )}

      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {isAdmin ? (
          <>
            {ADMIN_SECTIONS.map((section) => (
              <div key={section.heading} className="mb-3">
                {!collapsed && (
                  <p className="text-[9px] font-bold tracking-widest uppercase text-sidebar-foreground/40 px-3 py-1 mb-0.5">
                    {section.heading}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink key={item.href + item.label} item={item} collapsed={collapsed} location={location} />
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-0.5 mt-1 border-t border-sidebar-border pt-2">
              <NavLink
                item={{ href: "/profile", label: "Profile", icon: User, tiers: ["ADMIN"] }}
                collapsed={collapsed}
                location={location}
              />
            </div>
          </>
        ) : (
          <div className="space-y-0.5">
            {ALL_NAV_ITEMS.filter((item) => tier && item.tiers.includes(tier)).map((item) => (
              <NavLink key={item.href + item.label} item={item} collapsed={collapsed} location={location} />
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
