import { CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { formatTier } from "@/lib/formatTier";
import "./sidebar.css";

interface SidebarProps {
  collapsed: boolean;
}

const BASIL_ICON_BASE = `${import.meta.env.BASE_URL}icons/basil`;
const BASIL_ICONS = {
  bag: "bag.png",
  bookCheck: "book-check.png",
  box: "box.png",
  chart: "chart.png",
  clipboard: "clipboard.png",
  document: "document.png",
  exchange: "exchange.png",
  key: "key.png",
  layout: "layout.png",
  plus: "plus.png",
  settings: "settings.png",
  shield: "shield.png",
  user: "user.png",
  wallet: "wallet.png",
} as const;
type BasilIconName = keyof typeof BASIL_ICONS;

function BasilIcon({ name, className = "" }: { name: BasilIconName; className?: string }) {
  const style = {
    "--basil-icon": `url("${BASIL_ICON_BASE}/${BASIL_ICONS[name]}")`,
  } as CSSProperties;
  return <span className={`market-sidebar-icon ${className}`} style={style} aria-hidden="true" />;
}

interface NavItem {
  href: string;
  label: string;
  icon: BasilIconName;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    heading: "Exchange Admin",
    items: [
      { href: "/admin/auctions",     label: "Auction Sessions", icon: "exchange" },
      { href: "/admin/auctions/new", label: "New Auction",      icon: "plus"     },
      { href: "/admin/lots",         label: "All Tea Lots",     icon: "box"      },
      { href: "/admin/ewrs",         label: "All eWRs",         icon: "document" },
      { href: "/admin/users",        label: "Users",            icon: "user"     },
      { href: "/admin/earnings",     label: "Earnings",         icon: "wallet"   },
      { href: "/admin/audit",        label: "Audit Log",        icon: "shield"   },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market",    label: "Market Overview", icon: "chart"     },
      { href: "/mandates",  label: "Mandates",        icon: "bookCheck" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access",  icon: "key"  },
      { href: "/profile",             label: "Profile",      icon: "user" },
    ],
  },
];

const BROKER_SECTIONS: NavSection[] = [
  {
    heading: "Brokerage",
    items: [
      { href: "/broker",                 label: "Dashboard",        icon: "layout"   },
      { href: "/broker/mandate-holders", label: "Mandate Holders",  icon: "user"     },
      { href: "/broker/lots/new",        label: "List New Tea Lot", icon: "plus"     },
      { href: "/mandates",               label: "My Mandates",      icon: "bookCheck" },
      { href: "/broker/auctions",        label: "Auction Sessions", icon: "exchange" },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: "bag" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access", icon: "key"  },
      { href: "/profile",             label: "Profile",    icon: "user" },
    ],
  },
];

const STANDARD_SECTIONS: NavSection[] = [
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: "bag" },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: "user" },
    ],
  },
];

function NavLink({ item, collapsed, location }: { item: NavItem; collapsed: boolean; location: string }) {
  const isActive = location === item.href || location.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`
        market-sidebar-nav-item flex items-center gap-3 transition-colors
        ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}
        ${isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/50 text-sidebar-foreground/75 hover:text-sidebar-foreground"
        }
      `}
    >
      <BasilIcon name={item.icon} className="market-sidebar-nav-icon shrink-0" />
      {!collapsed && <span className="text-sm truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [location] = useLocation();
  const { data: dbUser } = useGetMe();
  const tier = dbUser?.tier;
  const isAdmin = tier === "ADMIN";
  const isBroker = tier === "ENABLER";

  const sections = isAdmin ? ADMIN_SECTIONS : isBroker ? BROKER_SECTIONS : STANDARD_SECTIONS;

  return (
    <aside
      className={`market-sidebar market-sidebar--tea ${isAdmin ? "is-admin" : ""} ${collapsed ? "is-collapsed" : ""}
        flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0
        transition-all duration-200 ease-in-out overflow-hidden
        ${collapsed ? "w-[72px]" : "w-60"}
      `}
    >
      <div className="market-sidebar-logo" aria-label="TokenHarvest">
        {collapsed ? "TH" : "TokenHarvest"}
      </div>
      <div className="market-sidebar-brand">
        <BasilIcon name="bag" className="market-sidebar-brand-icon" />
        {!collapsed && <span className="market-sidebar-brand-name">Tea Market</span>}
      </div>

      {!collapsed && isAdmin && tier && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <BasilIcon name="shield" className="market-sidebar-role-icon text-primary shrink-0" />
          <span className={`inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 border
            ${isAdmin
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-sidebar-accent/60 text-sidebar-accent-foreground border-sidebar-border"
            }`}>
            {isAdmin ? "Exchange Admin" : formatTier(tier)}
          </span>
        </div>
      )}

      <nav className="market-sidebar-nav flex-1 px-2 py-2 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.heading} className="market-sidebar-nav-group mb-3">
            {!collapsed && (
              <p className="market-sidebar-nav-group-title text-[9px] font-bold tracking-widest uppercase text-sidebar-foreground/40 px-3 py-1 mb-0.5">
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

      </nav>
    </aside>
  );
}
