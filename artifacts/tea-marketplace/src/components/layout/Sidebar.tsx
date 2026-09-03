import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { formatTier } from "@/lib/formatTier";
import "./sidebar.css";

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const SIDEBAR_GLYPHS = {
  brand: "~",
  auction: ">",
  newAuction: "+",
  lots: "#",
  ewrs: "=",
  users: "@",
  earnings: "$",
  audit: "✓",
  market: "*",
  mandates: ">",
  api: "#",
  profile: "o",
  dashboard: "=",
} as const;

const ADMIN_SECTIONS: NavSection[] = [
  {
    heading: "Exchange Admin",
    items: [
      { href: "/admin/auctions",     label: "Auction Sessions", icon: SIDEBAR_GLYPHS.auction  },
      { href: "/admin/auctions/new", label: "New Auction",      icon: SIDEBAR_GLYPHS.newAuction },
      { href: "/admin/lots",         label: "All Tea Lots",     icon: SIDEBAR_GLYPHS.lots      },
      { href: "/admin/ewrs",         label: "All eWRs",         icon: SIDEBAR_GLYPHS.ewrs      },
      { href: "/admin/users",        label: "Users",            icon: SIDEBAR_GLYPHS.users     },
      { href: "/admin/earnings",     label: "Earnings",         icon: SIDEBAR_GLYPHS.earnings  },
      { href: "/admin/audit",        label: "Audit Log",        icon: SIDEBAR_GLYPHS.audit     },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market",    label: "Market Overview", icon: SIDEBAR_GLYPHS.market   },
      { href: "/mandates",  label: "Mandates",        icon: SIDEBAR_GLYPHS.mandates },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access",  icon: SIDEBAR_GLYPHS.api     },
      { href: "/profile",             label: "Profile",      icon: SIDEBAR_GLYPHS.profile },
    ],
  },
];

const BROKER_SECTIONS: NavSection[] = [
  {
    heading: "Brokerage",
    items: [
      { href: "/broker",                 label: "Dashboard",        icon: SIDEBAR_GLYPHS.dashboard  },
      { href: "/broker/mandate-holders", label: "Mandate Holders",  icon: SIDEBAR_GLYPHS.users      },
      { href: "/broker/lots/new",        label: "List New Tea Lot", icon: SIDEBAR_GLYPHS.newAuction },
      { href: "/mandates",               label: "My Mandates",      icon: SIDEBAR_GLYPHS.mandates    },
      { href: "/broker/auctions",        label: "Auction Sessions", icon: SIDEBAR_GLYPHS.auction     },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: SIDEBAR_GLYPHS.market },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access", icon: SIDEBAR_GLYPHS.api     },
      { href: "/profile",             label: "Profile",    icon: SIDEBAR_GLYPHS.profile },
    ],
  },
];

const STANDARD_SECTIONS: NavSection[] = [
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: SIDEBAR_GLYPHS.market },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: SIDEBAR_GLYPHS.profile },
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
      <span className="market-sidebar-nav-icon shrink-0" aria-hidden="true">
        {item.icon}
      </span>
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
        <span className="market-sidebar-brand-icon" aria-hidden="true">
          {SIDEBAR_GLYPHS.brand}
        </span>
        {!collapsed && <span className="market-sidebar-brand-name">Tea Market</span>}
      </div>

      {!collapsed && isAdmin && tier && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="market-sidebar-role-icon text-primary shrink-0" aria-hidden="true">
            {SIDEBAR_GLYPHS.audit}
          </span>
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
