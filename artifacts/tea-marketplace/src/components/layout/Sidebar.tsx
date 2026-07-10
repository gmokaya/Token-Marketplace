import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { 
  BarChart2, 
  Leaf, 
  FileText, 
  Gavel, 
  History,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { data: user } = useGetMe();
  const [location] = useLocation();

  if (!user) return null;
  const tier = user.tier;

  const links = [];

  if (tier === "ENABLER") {
    links.push({ href: "/broker", label: "Broker Dashboard", icon: LayoutDashboard });
    links.push({ href: "/mandates", label: "My Mandates", icon: FileText });
    links.push({ href: "/admin/auctions/new", label: "Create Auction", icon: Gavel });
  }

  if (tier === "OFF_TAKER") {
    links.push({ href: "/market", label: "Spot Market", icon: BarChart2 });
  }

  if (tier === "PRODUCER") {
    links.push({ href: "/mandates", label: "Mandates Given", icon: FileText });
    links.push({ href: "/lots", label: "My Lots", icon: Leaf });
  }

  if (tier === "ADMIN") {
    links.push({ href: "/admin/auctions", label: "Auctions", icon: Gavel });
    links.push({ href: "/market", label: "Market Overview", icon: BarChart2 });
  }

  // Everyone can see Profile eventually, but we have it in the top right.
  // If we want a general "Auctions" link:
  if (tier !== "ADMIN" && tier !== "ENABLER") {
    links.push({ href: "/admin/auctions", label: "Active Auctions", icon: History });
  }

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col h-full">
      <div className="p-4 flex-1 overflow-y-auto space-y-1">
        <div className="mb-4 px-2">
          <h2 className="text-xs font-semibold text-sidebar-foreground/50 tracking-wider uppercase">Menu</h2>
        </div>
        {links.map((link) => {
          const isActive = location === link.href || (location.startsWith(link.href) && link.href !== "/");
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-2 border-transparent"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}