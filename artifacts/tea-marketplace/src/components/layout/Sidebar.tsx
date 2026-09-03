import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, Leaf, FileText, Gavel, BarChart2,
  ShoppingBag, User, Shield, PlusCircle, Users,
  ScrollText, Key, Landmark, Activity,
} from "lucide-react";
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

const ADMIN_SECTIONS: NavSection[] = [
  {
    heading: "Exchange Admin",
    items: [
      { href: "/admin/auctions",     label: "Auction Sessions", icon: Gavel      },
      { href: "/admin/auctions/new", label: "New Auction",      icon: PlusCircle },
      { href: "/admin/lots",         label: "All Tea Lots",     icon: Leaf       },
      { href: "/admin/ewrs",         label: "All eWRs",         icon: ScrollText },
      { href: "/admin/users",        label: "Users",            icon: Users      },
      { href: "/admin/earnings",     label: "Earnings",         icon: Landmark   },
      { href: "/admin/audit",        label: "Audit Log",        icon: Shield     },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market",    label: "Market Overview", icon: BarChart2 },
      { href: "/mandates",  label: "Mandates",        icon: FileText  },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access",  icon: Key  },
      { href: "/profile",             label: "Profile",      icon: User },
    ],
  },
];

const BROKER_SECTIONS: NavSection[] = [
  {
    heading: "Brokerage",
    items: [
      { href: "/broker",                 label: "Dashboard",        icon: LayoutDashboard },
      { href: "/broker/mandate-holders", label: "Mandate Holders",  icon: Users           },
      { href: "/broker/lots/new",        label: "List New Tea Lot", icon: PlusCircle      },
      { href: "/mandates",               label: "My Mandates",      icon: FileText        },
      { href: "/broker/auctions",        label: "Auction Sessions", icon: Gavel           },
    ],
  },
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: ShoppingBag },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/settings/api-access", label: "API Access", icon: Key  },
      { href: "/profile",             label: "Profile",    icon: User },
    ],
  },
];

const STANDARD_SECTIONS: NavSection[] = [
  {
    heading: "Market",
    items: [
      { href: "/market", label: "Spot Market", icon: Leaf },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: User },
    ],
  },
];

function NavLink({ item, collapsed, location }: { item: NavItem; collapsed: boolean; location: string }) {
  const isActive = location === item.href || location.startsWith(`${item.href}/`);
  const Icon = item.icon;
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
      <Icon className="market-sidebar-nav-icon shrink-0" />
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
        <Leaf className="market-sidebar-brand-icon" aria-hidden="true" />
        {!collapsed && <span className="market-sidebar-brand-name">Tea Market</span>}
      </div>

      {!collapsed && isAdmin && tier && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <Shield className="market-sidebar-role-icon text-primary shrink-0" aria-hidden="true" />
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
