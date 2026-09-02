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

function NavItem({ href, icon: Icon, label, collapsed }: {
  href: string; icon: any; label: string; collapsed: boolean;
}) {
  const [location] = useLocation();
  const active = location === href || location.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active
          ? "bg-[#393e44] text-white font-medium"
          : "text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-white/45"}`} />
      {!collapsed && <span className="truncate text-[11px]">{label}</span>}
    </Link>
  );
}

function NavGroup({ title, children, collapsed }: { title: string; children: ReactNode; collapsed: boolean }) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="mb-2 px-3 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
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

  return (
    <aside
      className={`${w} flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#22262a] text-white transition-all duration-200 ease-in-out`}
    >
      {/* Sidebar brand strip */}
      <div className={`flex h-9 shrink-0 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}>
        <MarketIcon className="h-3 w-3 shrink-0 text-white/80" aria-hidden="true" />
        {!collapsed && <span className="tokenharvest-wordmark truncate text-xs text-white">{marketName}</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-0">
        <div className="flex flex-col gap-1 pb-10">

          {/* Exchange Admin */}
          {role === "ADMIN" && (
            <>
              <NavGroup title="Exchange Admin" collapsed={collapsed}>
                <NavItem href="/admin/auctions" icon={Gavel}      label="Auction Sessions" collapsed={collapsed} />
                <NavItem href="/admin/lots"     icon={Package}    label="All Lots"         collapsed={collapsed} />
                <NavItem href="/admin/ewrs"     icon={ScrollText} label="All eWRs"         collapsed={collapsed} />
                <NavItem href="/admin/users"    icon={Users}      label="Users"            collapsed={collapsed} />
                <NavItem href="/admin/earnings" icon={Landmark}   label="Earnings"         collapsed={collapsed} />
                <NavItem href="/admin/audit"    icon={Shield}     label="Audit Log"        collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Settings" collapsed={collapsed}>
                <NavItem href="/settings/api-access" icon={Key}   label="API Access"  collapsed={collapsed} />
                <NavItem href="/profile"              icon={Users} label="My Profile"  collapsed={collapsed} />
              </NavGroup>
            </>
          )}

          {/* One shared non-admin workspace for every profile type. */}
          {role && role !== "ADMIN" && (
            <>
              <NavGroup title="Market" collapsed={collapsed}>
                <NavItem href="/market" icon={MarketIcon} label="Spot Market" collapsed={collapsed} />
              </NavGroup>
              <NavGroup title="Account" collapsed={collapsed}>
                <NavItem href="/profile" icon={Users} label="My Profile" collapsed={collapsed} />
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
