import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';

const NavLink = ({ href, children }: { href: string; children: ReactNode }) => {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link href={href} className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
      {children}
    </Link>
  );
};

const NavSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mb-6">
    <h4 className="px-3 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-[260px] bg-sidebar border-r border-sidebar-border overflow-y-auto flex flex-col">
      <div className="p-6 sticky top-0 bg-sidebar z-10 backdrop-blur-sm bg-sidebar/90">
        <Link href="/" className="flex items-center gap-2">
          <div className="font-bold text-lg text-sidebar-foreground">
            TokenHarvest <span className="text-primary">API</span>
          </div>
          <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">v1</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 pb-6">
        <div className="space-y-1 mb-6">
          <NavLink href="/">Overview</NavLink>
        </div>

        <NavSection title="Coffee">
          <NavLink href="/coffee/lots">Lots</NavLink>
          <NavLink href="/coffee/auctions">Auctions</NavLink>
        </NavSection>

        <NavSection title="Tea">
          <NavLink href="/tea/lots">Lots</NavLink>
          <NavLink href="/tea/auctions">Auctions</NavLink>
        </NavSection>

        <NavSection title="Marketplace">
          <NavLink href="/publishing">Publishing</NavLink>
        </NavSection>
      </nav>
    </aside>
  );
}
