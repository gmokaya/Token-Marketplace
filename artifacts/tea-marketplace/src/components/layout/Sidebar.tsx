import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  LayoutDashboard, Leaf, FileText, Gavel, BarChart2,
  ShoppingBag, User, Shield, PlusCircle,
} from "lucide-react";
import { formatTier } from "@/lib/formatTier";

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface AccountSection {
  tier: string;
  heading: string;
  items: NavItem[];
}

const ACCOUNT_SECTIONS: AccountSection[] = [
  {
    tier: "ENABLER",
    heading: "Brokers",
    items: [
      { href: "/broker",              label: "Broker Dashboard", icon: LayoutDashboard },
      { href: "/broker/lots/new",     label: "List New Tea Lot", icon: PlusCircle     },
      { href: "/mandates",            label: "My Mandates",      icon: FileText       },
      { href: "/admin/auctions",      label: "Auction Sessions", icon: Gavel          },
      { href: "/market",              label: "Spot Market",      icon: ShoppingBag    },
      { href: "/profile",             label: "Profile",          icon: User           },
    ],
  },
  {
    tier: "PRODUCER",
    heading: "Producers",
    items: [
      { href: "/mandates",            label: "Mandates Given",   icon: FileText       },
      { href: "/admin/auctions",      label: "Active Auctions",  icon: Gavel          },
      { href: "/market",              label: "Spot Market",      icon: ShoppingBag    },
      { href: "/profile",             label: "Profile",          icon: User           },
    ],
  },
  {
    tier: "OFF_TAKER",
    heading: "Traders",
    items: [
      { href: "/market",              label: "Spot Market",      icon: ShoppingBag    },
      { href: "/admin/auctions",      label: "Live Auctions",    icon: Gavel          },
      { href: "/profile",             label: "Profile",          icon: User           },
    ],
  },
  {
    tier: "FINANCIER",
    heading: "Exchange",
    items: [
      { href: "/admin/auctions",      label: "Auction Sessions", icon: Gavel          },
      { href: "/admin/auctions/new",  label: "New Auction",      icon: PlusCircle     },
      { href: "/market",              label: "Market Overview",  icon: BarChart2      },
      { href: "/broker",              label: "Lots Overview",    icon: Leaf           },
      { href: "/mandates",            label: "Mandates",         icon: FileText       },
      { href: "/profile",             label: "Profile",          icon: User           },
    ],
  },
  {
    tier: "ADMIN",
    heading: "Exchange Admin",
    items: [
      { href: "/admin/auctions",      label: "Auction Sessions", icon: Gavel          },
      { href: "/admin/auctions/new",  label: "New Auction",      icon: PlusCircle     },
      { href: "/market",              label: "Market Overview",  icon: BarChart2      },
      { href: "/broker",              label: "Lots Overview",    icon: Leaf           },
      { href: "/mandates",            label: "Mandates",         icon: FileText       },
      { href: "/profile",             label: "Profile",          icon: User           },
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
        flex items-center gap-3 transition-colors
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

  const visibleSections = isAdmin
    ? ACCOUNT_SECTIONS
    : ACCOUNT_SECTIONS.filter((s) => s.tier === tier);

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
            {isAdmin ? "Exchange Admin" : formatTier(tier)}
          </span>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pt-3 pb-1">
          <Link href="/">
            <img src={`${basePath}/logo-white.png`} alt="TokenHarvest Tea" className="h-6 w-auto opacity-80 cursor-pointer" />
          </Link>
        </div>
      )}

      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.tier} className="mb-3">
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
      </nav>
    </aside>
  );
}
