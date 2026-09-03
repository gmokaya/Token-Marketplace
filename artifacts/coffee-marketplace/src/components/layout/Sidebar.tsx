import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  BarChart4,
  Users,
  ScrollText,
  Gavel,
  ShieldCheck,
  Home,
  PlusCircle,
  List,
  Warehouse,
  DollarSign,
  Key,
  Coffee,
  Activity,
  Landmark,
  Shield,
} from "lucide-react";
import "./sidebar.css";

interface SidebarProps {
  collapsed: boolean;
}

function NavItem({ href, icon: Icon, label, collapsed }: {
  href: string; icon: any; label: string; collapsed: boolean;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`market-sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-accent" : "text-sidebar-foreground/50"}`} />
      {!collapsed && <span className="text-sm truncate">{label}</span>}
    </Link>
  );
}

function NavGroup({ title, children, collapsed }: { title: string; children: ReactNode; collapsed: boolean }) {
  return (
    <div className="market-sidebar-nav-group mb-6">
      {!collapsed && (
        <div className="market-sidebar-nav-group-title px-3 mb-2 text-xs font-mono font-medium tracking-wider text-sidebar-foreground/40 uppercase">
          {title}
        </div>
      )}
      <div className="market-sidebar-nav-items space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data: me } = useGetMe();
  const role = me?.tier;

  const w = collapsed ? "w-14" : "w-64";

  return (
    <aside
      className={`market-sidebar market-sidebar--coffee ${role === "ADMIN" ? "is-admin" : ""} ${collapsed ? "is-collapsed" : ""} ${w} shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200 overflow-hidden h-full`}
    >
      {/* Sidebar brand strip */}
      <div className={`market-sidebar-brand flex h-14 items-center border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2" : "px-4 gap-2"}`}>
        <Coffee className="w-4 h-4 text-accent shrink-0" />
        {!collapsed && <span className="market-sidebar-brand-name tokenharvest-wordmark text-lg text-white truncate">Coffee Market</span>}
      </div>

      <nav className="market-sidebar-nav flex-1 overflow-y-auto p-2">
        <div className="market-sidebar-nav-inner flex flex-col gap-1 pb-10">

          {/* Exchange Admin */}
          {role === "ADMIN" && (
            <>
              <NavGroup title="Exchange Admin" collapsed={collapsed}>
                <NavItem href="/admin/auctions" icon={Gavel}      label="Auction Sessions" collapsed={collapsed} />
                <NavItem href="/admin/auctions/new" icon={PlusCircle} label="New Auction"  collapsed={collapsed} />
                <NavItem href="/admin/lots"     icon={Coffee}     label="All Lots"         collapsed={collapsed} />
                <NavItem href="/admin/ewrs"     icon={ScrollText} label="All eWRs"         collapsed={collapsed} />
                <NavItem href="/admin/users"    icon={Users}      label="Users"            collapsed={collapsed} />
                <NavItem href="/admin/earnings" icon={Landmark}   label="Earnings"         collapsed={collapsed} />
                <NavItem href="/admin/audit"    icon={Shield}     label="Audit Log"        collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Market" collapsed={collapsed}>
                <NavItem href="/market"     icon={BarChart4}   label="Spot Market"  collapsed={collapsed} />
                <NavItem href="/mandates"   icon={ShieldCheck} label="Mandates"     collapsed={collapsed} />
                <NavItem href="/warehouses" icon={Warehouse}   label="Warehouses"   collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed}>
                <NavItem href="/settings/api-access" icon={Key}   label="API Access"  collapsed={collapsed} />
                <NavItem href="/profile"              icon={Users} label="My Profile"  collapsed={collapsed} />
              </NavGroup>
            </>
          )}

          {/* Broker */}
          {role === "ENABLER" && (
            <>
              <NavGroup title="Brokerage" collapsed={collapsed}>
                <NavItem href="/broker"              icon={Activity}   label="Overview"       collapsed={collapsed} />
                <NavItem href="/broker/lots"         icon={List}       label="My Lots"        collapsed={collapsed} />
                <NavItem href="/broker/lots/new"     icon={PlusCircle} label="List New Lot"   collapsed={collapsed} />
                <NavItem href="/broker/mandates"     icon={ShieldCheck} label="Mandates"      collapsed={collapsed} />
                <NavItem href="/broker/auctions"     icon={Gavel}      label="Auction Sessions" collapsed={collapsed} />
                <NavItem href="/broker/earnings"     icon={DollarSign} label="Earnings"       collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Market" collapsed={collapsed}>
                <NavItem href="/market" icon={BarChart4} label="Spot Market" collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed}>
                <NavItem href="/settings/api-access" icon={Key}   label="API Access"  collapsed={collapsed} />
                <NavItem href="/profile"              icon={Users} label="My Profile"  collapsed={collapsed} />
              </NavGroup>
            </>
          )}

          {/* Fallback for other roles: show market only */}
          {role && role !== "ADMIN" && role !== "ENABLER" && (
            <NavGroup title="Market" collapsed={collapsed}>
              <NavItem href="/market" icon={BarChart4} label="Spot Market" collapsed={collapsed} />
            </NavGroup>
          )}

        </div>
      </nav>
    </aside>
  );
}
