import { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
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

function NavItem({ href, icon: Icon, label, collapsed, themeClass }: {
  href: string; icon: BasilIconName; label: string; collapsed: boolean; themeClass: string;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`market-sidebar-nav-item ${themeClass} ${active ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
    >
      <BasilIcon name={Icon} className={`market-sidebar-nav-icon ${active ? "is-active" : ""}`} />
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

  const marketIcon: BasilIconName = "bag";
  const themeClass = SIDEBAR_THEME_CLASSES[market];

  return (
    <aside
      className={`market-sidebar ${themeClass} ${collapsed ? "is-collapsed" : ""} ${role === "ADMIN" ? "is-admin" : ""}`}
    >
      <div className="market-sidebar-logo" aria-label="TokenHarvest">
        {collapsed ? "TH" : "TokenHarvest"}
      </div>
      {/* Sidebar brand strip */}
      <div className="market-sidebar-brand">
        <BasilIcon name={marketIcon} className="market-sidebar-brand-icon" />
        {!collapsed && <span className="market-sidebar-brand-name">{marketName}</span>}
      </div>

      <nav className="market-sidebar-nav">
        <div className="market-sidebar-nav-inner">

          {/* Exchange Admin */}
          {role === "ADMIN" && (
            <>
              <NavGroup title="Exchange Admin" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/admin/auctions" icon="exchange" label="Auction Sessions" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/lots"     icon="box"      label="All Lots"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/ewrs"     icon="document" label="All eWRs"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/users"    icon="user"     label="Users"            collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/earnings" icon="wallet"   label="Earnings"         collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/admin/audit"    icon="shield"   label="Audit Log"        collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
              <NavGroup title="Market Access" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/market" icon="chart" label="Spot Market" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/auctions" icon="exchange" label="Live Auctions" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/warehouses" icon="layout" label="Warehouses" collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/settings/api-access" icon="key"  label="API Access"  collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/profile"              icon="user" label="My Profile"  collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
            </>
          )}

          {/* One shared non-admin workspace for every profile type. */}
          {role && role !== "ADMIN" && (
            <>
              <NavGroup title="Market" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/market" icon="chart" label="Spot Market" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/auctions" icon="exchange" label="Live Auctions" collapsed={collapsed} themeClass={themeClass} />
                <NavItem href="/warehouses" icon="layout" label="Warehouses" collapsed={collapsed} themeClass={themeClass} />
              </NavGroup>
              {(role === "PRODUCER" || role === "COOPERATIVE" || role === "ENABLER") && (
                <NavGroup title={role === "ENABLER" ? "Broker Access" : "Trading Tools"} collapsed={collapsed} theme={themeClass}>
                  <NavItem href="/mandates" icon="shield" label="Broker Mandates" collapsed={collapsed} themeClass={themeClass} />
                </NavGroup>
              )}
              <NavGroup title="Account" collapsed={collapsed} theme={themeClass}>
                <NavItem href="/profile" icon="user" label="My Profile" collapsed={collapsed} themeClass={themeClass} />
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
