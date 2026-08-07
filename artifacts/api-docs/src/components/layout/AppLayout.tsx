import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
