"use client";
import { Bell, Search } from "lucide-react";

export function Topbar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="min-h-16 border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 pl-16 md:px-6 md:pl-6">
      <div className="flex min-w-0 items-center gap-6">
        <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {right}
        <div className="relative hidden items-center w-48 sm:flex">
          <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
          />
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </button>
        <div className="hidden w-9 h-9 rounded-lg overflow-hidden bg-secondary ring-2 ring-transparent hover:ring-accent/50 transition-all duration-200 sm:flex items-center justify-center text-xs font-semibold text-accent-foreground bg-gradient-to-br from-accent/80 to-chart-1">
          DC
        </div>
      </div>
    </header>
  );
}
