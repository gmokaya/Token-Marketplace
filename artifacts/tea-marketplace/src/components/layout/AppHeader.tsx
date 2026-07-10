import { UserButton } from "@clerk/react";
import { Link } from "wouter";
import { Leaf } from "lucide-react";

export function AppHeader() {
  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0 shadow-sm z-10 relative">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Mombasa Exchange</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8 rounded-none border border-border"
            }
          }}
        />
      </div>
    </header>
  );
}