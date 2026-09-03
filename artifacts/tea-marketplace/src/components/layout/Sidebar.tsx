import { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
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
  document: "document.png",
  exchange: "exchange.png",
  key: "key.png",
  layout: "layout.png",
  plus: "plus.png",
  shield: "shield.png",
  user: "user.png",
  wallet: "wallet.png",
} as const;
type BasilIconName = keyof typeof BASIL_ICONS;

function BasilIcon({
  name,
  className = "",
}: {
  name: BasilIconName;
  className?: string;
}) {
  const style = {
    "--basil-icon": `url("${BASIL_ICON_BASE}/${BASIL_ICONS[name]}")`,
  } as CSSProperties;

  return (
    <span
      className={`market-sidebar-icon ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function NavItem({
  href,
  icon,
  label,
  collapsed,
  themeClass,
}: {
  href: string;
  icon: BasilIconName;
  label: string;
  collapsed: boolean;
  themeClass: string;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`market-sidebar-nav-item ${themeClass} ${active ? "is-active" : ""}`}
      title={collapsed ? label : undefined}
    >
      <BasilIcon
        name={icon}
        className={`market-sidebar-nav-icon ${active ? "is-active" : ""}`}
      />
      {!collapsed && <span className="truncate text-[11px]">{label}</span>}
    </Link>
  );
}

function NavGroup({
  title,
  children,
  collapsed,
  theme,
}: {
  title: string;
  children: ReactNode;
  collapsed: boolean;
  theme: string;
}) {
  return (
    <div className={`market-sidebar-nav-group ${theme}`}>
      {!collapsed && (
        <div className="market-sidebar-nav-group-title">{title}</div>
      )}
      <div className="market-sidebar-nav-items">{children}</div>
    </div>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data: me } = useGetMe();
  const role = me?.tier;
  const themeClass = "market-sidebar--tea";

  return (
    <aside
      className={`market-sidebar ${themeClass} ${collapsed ? "is-collapsed" : ""} ${role === "ADMIN" ? "is-admin" : ""}`}
    >
      <div className="market-sidebar-logo" aria-label="TokenHarvest">
        {collapsed ? "TH" : "TokenHarvest"}
      </div>

      <div className="market-sidebar-brand">
        <BasilIcon name="bag" className="market-sidebar-brand-icon" />
        {!collapsed && (
          <span className="market-sidebar-brand-name">Tea Market</span>
        )}
      </div>

      <nav className="market-sidebar-nav">
        <div className="market-sidebar-nav-inner">
          {role === "ADMIN" && (
            <>
              <NavGroup
                title="Exchange Admin"
                collapsed={collapsed}
                theme={themeClass}
              >
                <NavItem
                  href="/admin/auctions"
                  icon="exchange"
                  label="Auction Sessions"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/auctions/new"
                  icon="plus"
                  label="New Auction"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/lots"
                  icon="box"
                  label="All Tea Lots"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/ewrs"
                  icon="document"
                  label="All eWRs"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/users"
                  icon="user"
                  label="Users"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/earnings"
                  icon="wallet"
                  label="Earnings"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/admin/audit"
                  icon="shield"
                  label="Audit Log"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>

              <NavGroup title="Market" collapsed={collapsed} theme={themeClass}>
                <NavItem
                  href="/market"
                  icon="chart"
                  label="Market Overview"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/mandates"
                  icon="bookCheck"
                  label="Mandates"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>

              <NavGroup
                title="Settings"
                collapsed={collapsed}
                theme={themeClass}
              >
                <NavItem
                  href="/settings/api-access"
                  icon="key"
                  label="API Access"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/profile"
                  icon="user"
                  label="Profile"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>
            </>
          )}

          {role === "ENABLER" && (
            <>
              <NavGroup
                title="Brokerage"
                collapsed={collapsed}
                theme={themeClass}
              >
                <NavItem
                  href="/broker"
                  icon="layout"
                  label="Dashboard"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/broker/mandate-holders"
                  icon="user"
                  label="Mandate Holders"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/broker/lots/new"
                  icon="plus"
                  label="List New Tea Lot"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/mandates"
                  icon="bookCheck"
                  label="My Mandates"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/broker/auctions"
                  icon="exchange"
                  label="Auction Sessions"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>

              <NavGroup title="Market" collapsed={collapsed} theme={themeClass}>
                <NavItem
                  href="/market"
                  icon="bag"
                  label="Spot Market"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>

              <NavGroup
                title="Settings"
                collapsed={collapsed}
                theme={themeClass}
              >
                <NavItem
                  href="/settings/api-access"
                  icon="key"
                  label="API Access"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
                <NavItem
                  href="/profile"
                  icon="user"
                  label="Profile"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>
            </>
          )}

          {role && role !== "ADMIN" && role !== "ENABLER" && (
            <>
              <NavGroup title="Market" collapsed={collapsed} theme={themeClass}>
                <NavItem
                  href="/market"
                  icon="bag"
                  label="Spot Market"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
              </NavGroup>

              <NavGroup
                title="Account"
                collapsed={collapsed}
                theme={themeClass}
              >
                <NavItem
                  href="/profile"
                  icon="user"
                  label="My Profile"
                  collapsed={collapsed}
                  themeClass={themeClass}
                />
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