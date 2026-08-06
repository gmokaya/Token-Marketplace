import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, UserButton, SignOutButton } from "@clerk/react";
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
  Menu,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: ReactNode }) {
  const { data: me } = useGetMe();
  
  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground selection:bg-accent/20">
      <div className="hidden lg:block w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-accent shrink-0" />
            <span className="tokenharvest-wordmark text-xl text-white">Coffee Exchange</span>
          </div>
        </div>
        <div className="p-4 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarNav role={me?.tier} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-30">
          {/* Desktop: wordmark in header far-left */}
          <div className="hidden lg:flex items-center gap-2">
            <Coffee className="w-4 h-4 text-accent shrink-0" />
            <span className="tokenharvest-wordmark text-xl">Coffee Exchange</span>
          </div>

          {/* Mobile: hamburger + wordmark */}
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-accent shrink-0" />
                    <span className="tokenharvest-wordmark text-xl text-white">Coffee Exchange</span>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto">
                  <SidebarNav role={me?.tier} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-accent" />
              <span className="tokenharvest-wordmark text-lg">Coffee Exchange</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {me && (
              <div className="text-right hidden sm:block mr-2">
                <div className="text-sm font-medium leading-none">{me.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{me.company || "No company"} &bull; {me.tier}</div>
              </div>
            )}
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
          </div>
        </header>
        
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ role }: { role?: string }) {
  const [location] = useLocation();

  const isCurrent = (path: string) => location === path || location.startsWith(path + '/');
  
  const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const active = isCurrent(href);
    return (
      <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
        <Icon className={`w-4 h-4 ${active ? 'text-accent' : 'text-sidebar-foreground/50'}`} />
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  const NavGroup = ({ title, children }: { title: string, children: ReactNode }) => (
    <div className="mb-6">
      <div className="px-3 mb-2 text-xs font-mono font-medium tracking-wider text-sidebar-foreground/40 uppercase">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1 pb-10">
      <NavItem href="/dashboard" icon={Home} label="Dashboard" />
      <NavItem href="/market" icon={BarChart4} label="Spot Market" />
      
      {role === "PRODUCER" && (
        <NavGroup title="Producer Tools">
          <NavItem href="/producer" icon={LineChart} label="Overview" />
          <NavItem href="/producer/ewrs" icon={ScrollText} label="My eWRs" />
          <NavItem href="/producer/products" icon={Box} label="Lot Pipeline" />
          <NavItem href="/producer/rfqs" icon={Briefcase} label="RFQ Inbox" />
          <NavItem href="/producer/shipments" icon={Ship} label="Shipments" />
          <NavItem href="/producer/esg" icon={Leaf} label="ESG & Co-op" />
          <NavItem href="/mandates" icon={ShieldCheck} label="Broker Mandates" />
        </NavGroup>
      )}

      {role === "ENABLER" && (
        <NavGroup title="Brokerage">
          <NavItem href="/broker" icon={LineChart} label="Overview" />
          <NavItem href="/broker/mandates" icon={ShieldCheck} label="Mandates" />
          <NavItem href="/broker/auctions" icon={Gavel} label="My Auctions" />
        </NavGroup>
      )}

      {(role === "FINANCIER" || role === "PRODUCER") && (
        <NavGroup title="Capital">
          <NavItem href="/financing" icon={Landmark} label="Financing" />
        </NavGroup>
      )}

      {(role === "OFF_TAKER" || role === "PRODUCER") && (
        <NavGroup title="Contracts">
          <NavItem href="/forwards" icon={ScrollText} label="Forward Contracts" />
        </NavGroup>
      )}

      {role === "ADMIN" && (
        <NavGroup title="Platform Admin">
          <NavItem href="/admin/auctions" icon={Gavel} label="Auction Sessions" />
          <NavItem href="/admin/earnings" icon={Landmark} label="Earnings" />
          <NavItem href="/admin/audit" icon={ShieldCheck} label="Audit Log" />
        </NavGroup>
      )}
      
      <NavGroup title="Settings">
        <NavItem href="/profile" icon={Users} label="My Profile" />
      </NavGroup>
    </div>
  );
}
