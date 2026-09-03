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
import "./sidebar.css";

interface SidebarProps {
  collapsed: boolean;
  marketName?: string;
  market?: "grain" | "coffee" | "tea";
}

const SIDEBAR_THEME_CLASSES = {
  grain: "market-sidebar--grain",
  coffee: "market-sidebar--coffee",
  tea: "market-sidebar--tea",
} as const;

function NavItem({ href, icon: Icon, label, collapsed, themeClass }: {
  href: string; icon: any; label: string; collapsed: boolean; themeClass: string;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`market-sidebar-nav-item ${themeClass} ${active ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`market-sidebar-nav-icon ${active ? "is-active" : ""}`} />
      {!collapsed && <span className="truncate text-[11px]">{label}</span>}
    </Link>
  );
}

function NavGroup({ title, children, collapsed, theme }: {
  title: string;
  children: ReactNode;
  collapsed: boolean;
  theme: string;
}) {
  return (
    <div className={`market-sidebar-nav-group ${theme}`}>
      {!collapsed && (
        <div className="market-sidebar-nav-group-title">
          {title}
        </div>
      )}
      <div className="market-sidebar-nav-items">{children}</div>
    </div>
  );
}

export function Sidebar({ collapsed, marketName = "Grain Market", market = "grain" }: SidebarProps) {
  const { data: me } = useGetMe();
  const role = me?.tier;

  const MarketIcon = market === "coffee" ? Coffee : market === "tea" ? Leaf : Wheat;
  const themeClass = SIDEBAR_THEME_CLASSES[market];

  return (
    <aside
      className={`market-sidebar ${themeClass} ${collapsed ? "is-collapsed" : ""} ${role === "ADMIN" ? "is-admin" : ""}`}
    >
      {/* Sidebar brand strip */}
      <div className="market-sidebar-brand">
        <MarketIcon className="market-sidebar-brand-icon" aria-hidden="true" />
        {!collapsed && <span className="market-sidebar-brand-name">{marketName}</span>}
      </div>

      <nav className="market-sidebar-nav">
        <div className="market-sidebar-nav-inner">

          {/* Exchange Admin */}
          {role === "ADMIN" && (
            <>
              <NavGroup title="Exchange Admin" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/admin/auctions" icon={Gavel}      label="Auction Sessions" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/lots"     icon={Package}    label="All Lots"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/ewrs"     icon={ScrollText} label="All eWRs"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/users"    icon={Users}      label="Users"            collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/earnings" icon={Landmark}   label="Earnings"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/audit"    icon={Shield}     label="Audit Log"        collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/settings/api-access" icon={Key}   label="API Access"  collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/profile"              icon={Users} label="My Profile"  collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
            </>
          )}

          {/* One shared non-admin workspace for every profile type. */}
          {role && role !== "ADMIN" && (
            <>
              <NavGroup title="Market" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/market" icon={MarketIcon} label="Spot Market" collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
              <NavGroup title="Account" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/profile" icon={Users} label="My Profile" collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
            </>
          )}

          {!role && !collapsed && (
            <div className="market-sidebar-loading">
              Loading your market access…
            </div>
          )}

        </div>
      </nav>
    </aside>
  );
}
