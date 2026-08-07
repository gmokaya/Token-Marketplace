import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  Coffee,
  BarChart4,
  LineChart,
  Users,
  Box,
  ScrollText,
  Landmark,
  Tractor,
  Ship,
  Leaf,
  Gavel,
  ShieldCheck,
  Home,
  Briefcase,
  PlusCircle,
  List,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  DollarSign,
  Key,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
}

function NavItem({ href, icon: Icon, label, collapsed }: { href: string; icon: any; label: string; collapsed: boolean }) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
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
    <div className="mb-6">
      {!collapsed && (
        <div className="px-3 mb-2 text-xs font-mono font-medium tracking-wider text-sidebar-foreground/40 uppercase">
          {title}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data: me } = useGetMe();
  const role = me?.tier;

  const w = collapsed ? "w-14" : "w-64";

  return (
    <aside
      className={`${w} shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200 overflow-hidden h-full`}
    >
      <div className={`flex h-14 items-center border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-2" : "px-4 gap-2"}`}>
        <Coffee className="w-4 h-4 text-accent shrink-0" />
        {!collapsed && <span className="tokenharvest-wordmark text-lg text-white truncate">Specialty Coffee</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1 pb-10">
          <NavItem href="/dashboard" icon={Home} label="Dashboard" collapsed={collapsed} />
          <NavItem href="/market" icon={BarChart4} label="Spot Market" collapsed={collapsed} />

          {role === "PRODUCER" && (
            <NavGroup title="Producer Tools" collapsed={collapsed}>
              <NavItem href="/producer" icon={LineChart} label="Overview" collapsed={collapsed} />
              <NavItem href="/producer/ewrs" icon={ScrollText} label="My eWRs" collapsed={collapsed} />
              <NavItem href="/producer/products" icon={Box} label="Lot Pipeline" collapsed={collapsed} />
              <NavItem href="/producer/lots/new" icon={PlusCircle} label="List New Lot" collapsed={collapsed} />
              <NavItem href="/producer/rfqs" icon={Briefcase} label="RFQ Inbox" collapsed={collapsed} />
              <NavItem href="/producer/shipments" icon={Ship} label="Shipments" collapsed={collapsed} />
              <NavItem href="/producer/esg" icon={Leaf} label="ESG & Co-op" collapsed={collapsed} />
              <NavItem href="/mandates" icon={ShieldCheck} label="Broker Mandates" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "ENABLER" && (
            <NavGroup title="Brokerage" collapsed={collapsed}>
              <NavItem href="/broker" icon={LineChart} label="Overview" collapsed={collapsed} />
              <NavItem href="/broker/lots" icon={List} label="My Lots" collapsed={collapsed} />
              <NavItem href="/broker/lots/new" icon={PlusCircle} label="List New Lot" collapsed={collapsed} />
              <NavItem href="/broker/mandates" icon={ShieldCheck} label="Mandates" collapsed={collapsed} />
              <NavItem href="/broker/auctions" icon={Gavel} label="My Auctions" collapsed={collapsed} />
              <NavItem href="/broker/earnings" icon={DollarSign} label="Earnings" collapsed={collapsed} />
              <NavItem href="/warehouses" icon={Warehouse} label="Warehouses" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "OFF_TAKER" && (
            <NavGroup title="Trading" collapsed={collapsed}>
              <NavItem href="/market" icon={BarChart4} label="Spot Market" collapsed={collapsed} />
              <NavItem href="/admin/auctions" icon={Gavel} label="Live Auctions" collapsed={collapsed} />
              <NavItem href="/forwards" icon={TrendingUp} label="Forward Contracts" collapsed={collapsed} />
              <NavItem href="/warehouses" icon={Warehouse} label="Warehouses" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "FINANCIER" && (
            <NavGroup title="Capital Markets" collapsed={collapsed}>
              <NavItem href="/financing" icon={Landmark} label="Financing" collapsed={collapsed} />
              <NavItem href="/admin/auctions" icon={Gavel} label="Auction Sessions" collapsed={collapsed} />
              <NavItem href="/market" icon={BarChart4} label="Market Overview" collapsed={collapsed} />
              <NavItem href="/mandates" icon={ShieldCheck} label="Mandates" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "PRODUCER" && (
            <NavGroup title="Capital" collapsed={collapsed}>
              <NavItem href="/financing" icon={Landmark} label="Financing" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "PRODUCER" && (
            <NavGroup title="Contracts" collapsed={collapsed}>
              <NavItem href="/forwards" icon={TrendingUp} label="Forward Contracts" collapsed={collapsed} />
            </NavGroup>
          )}

          {role === "ADMIN" && (
            <NavGroup title="Platform Admin" collapsed={collapsed}>
              <NavItem href="/admin/auctions" icon={Gavel} label="Auction Sessions" collapsed={collapsed} />
              <NavItem href="/admin/auctions/new" icon={PlusCircle} label="New Auction" collapsed={collapsed} />
              <NavItem href="/admin/lots" icon={Coffee} label="All Lots" collapsed={collapsed} />
              <NavItem href="/admin/users" icon={Users} label="Users" collapsed={collapsed} />
              <NavItem href="/market" icon={BarChart4} label="Market Overview" collapsed={collapsed} />
              <NavItem href="/warehouses" icon={Warehouse} label="Warehouses" collapsed={collapsed} />
              <NavItem href="/mandates" icon={ShieldCheck} label="Mandates" collapsed={collapsed} />
              <NavItem href="/admin/earnings" icon={Landmark} label="Earnings" collapsed={collapsed} />
              <NavItem href="/admin/audit" icon={ShieldCheck} label="Audit Log" collapsed={collapsed} />
            </NavGroup>
          )}

          <NavGroup title="Settings" collapsed={collapsed}>
            <NavItem href="/profile" icon={Users} label="My Profile" collapsed={collapsed} />
            {(role === "PRODUCER" || role === "ENABLER" || role === "ADMIN") && (
              <NavItem href="/settings/api-access" icon={Key} label="API Access" collapsed={collapsed} />
            )}
          </NavGroup>
        </div>
      </nav>
    </aside>
  );
}
