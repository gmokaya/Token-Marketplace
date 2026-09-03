import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  Gavel,
  ScrollText,
  Package,
  Users,
  Landmark,
  Shield,
  Key,
  Wheat,
  Coffee,
  Leaf,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  marketName?: string;
  market?: "grain" | "coffee" | "tea";
}

const SIDEBAR_THEMES = {
  grain: {
    aside: "border-white/10 bg-[#22262a]",
    active: "bg-[#393e44]",
    item: "text-white/70 hover:bg-white/[0.06] hover:text-white",
    activeIcon: "text-white",
    icon: "text-white/45",
    group: "text-white/35",
    brand: "text-white",
  },
  coffee: {
    aside: "border-[#4b3428] bg-[#21150f]",
    active: "bg-[#58382b]",
    item: "text-[#dec1b1]/75 hover:bg-[#4a3025] hover:text-[#f7e6d8]",
    activeIcon: "text-[#fcd34d]",
    icon: "text-[#dec1b1]/50",
    group: "text-[#dec1b1]/60",
    brand: "text-[#f7e6d8]",
  },
  tea: {
    aside: "border-[#29463c] bg-[#0c201b]",
    active: "bg-[#2c4a3e]",
    item: "text-[#b8d7c1]/75 hover:bg-[#203a30] hover:text-[#e4f0e7]",
    activeIcon: "text-[#a1b16e]",
    icon: "text-[#b8d7c1]/50",
    group: "text-[#b8d7c1]/60",
    brand: "text-[#e4f0e7]",
  },
} as const;

type SidebarTheme = (typeof SIDEBAR_THEMES)[keyof typeof SIDEBAR_THEMES];

function NavItem({ href, icon: Icon, label, collapsed, theme }: {
  href: string; icon: any; label: string; collapsed: boolean; theme: SidebarTheme;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
        active
          ? `${theme.active} font-medium text-white`
          : theme.item
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? theme.activeIcon : theme.icon}`} />
      {!collapsed && <span className="truncate text-[11px]">{label}</span>}
    </Link>
  );
}

function NavGroup({ title, children, collapsed, theme }: {
  title: string;
  children: ReactNode;
  collapsed: boolean;
  theme: SidebarTheme;
}) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className={`mb-2 px-3 font-mono text-[8px] font-bold uppercase tracking-[0.16em] ${theme.group}`}>
          {title}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar({ collapsed, marketName = "Grain Market", market = "grain" }: SidebarProps) {
  const { data: me } = useGetMe();
  const role = me?.tier;

  const MarketIcon = market === "coffee" ? Coffee : market === "tea" ? Leaf : Wheat;
  const w = collapsed ? "w-[72px]" : role === "ADMIN" ? "w-60" : "w-40";
  const theme = SIDEBAR_THEMES[market];

  return (
    <aside
      className={`${w} flex h-full shrink-0 flex-col overflow-hidden border-r text-white transition-all duration-200 ease-in-out ${theme.aside}`}
    >
      {/* Sidebar brand strip */}
      <div className={`flex h-9 shrink-0 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}>
        <MarketIcon className={`h-3 w-3 shrink-0 ${theme.activeIcon}`} aria-hidden="true" />
        {!collapsed && <span className={`tokenharvest-wordmark truncate text-xs ${theme.brand}`}>{marketName}</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-0">
        <div className="flex flex-col gap-1 pb-10">

          {/* Exchange Admin */}
          {role === "ADMIN" && (
            <>
              <NavGroup title="Exchange Admin" collapsed={collapsed} theme={theme}>
                <NavItem href="/admin/auctions" icon={Gavel}      label="Auction Sessions" collapsed={collapsed} theme={theme} />
                <NavItem href="/admin/lots"     icon={Package}    label="All Lots"         collapsed={collapsed} theme={theme} />
                <NavItem href="/admin/ewrs"     icon={ScrollText} label="All eWRs"         collapsed={collapsed} theme={theme} />
                <NavItem href="/admin/users"    icon={Users}      label="Users"            collapsed={collapsed} theme={theme} />
                <NavItem href="/admin/earnings" icon={Landmark}   label="Earnings"         collapsed={collapsed} theme={theme} />
                <NavItem href="/admin/audit"    icon={Shield}     label="Audit Log"        collapsed={collapsed} theme={theme} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed} theme={theme}>
                <NavItem href="/settings/api-access" icon={Key}   label="API Access"  collapsed={collapsed} theme={theme} />
                <NavItem href="/profile"              icon={Users} label="My Profile"  collapsed={collapsed} theme={theme} />
              </NavGroup>
            </>
          )}

          {/* One shared non-admin workspace for every profile type. */}
          {role && role !== "ADMIN" && (
            <>
              <NavGroup title="Market" collapsed={collapsed} theme={theme}>
                <NavItem href="/market" icon={MarketIcon} label="Spot Market" collapsed={collapsed} theme={theme} />
              </NavGroup>
              <NavGroup title="Account" collapsed={collapsed} theme={theme}>
                <NavItem href="/profile" icon={Users} label="My Profile" collapsed={collapsed} theme={theme} />
              </NavGroup>
            </>
          )}

          {!role && !collapsed && (
            <div className="px-3 py-6 text-center text-xs text-white/45">
              Loading your market access…
            </div>
          )}

        </div>
      </nav>
    </aside>
  );
}
