"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, NAV_GROUPS } from "./nav-config";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line bg-surface h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-line flex items-center gap-3">
        <span className="text-2xl">🦊</span>
        <div>
          <div className="text-lg font-medium tracking-tight text-ink">AEON Dial</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Operating System</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => {
          const items = NAV.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="px-3 mb-4">
              <div className="px-2 mb-1 text-[10px] uppercase tracking-[0.18em] text-dim">{group}</div>
              {items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? "bg-emberdim text-ember" : "text-muted hover:text-ink hover:bg-card"
                    }`}>
                    <Icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-line text-[10px] text-dim">v3.0.0 · Hetzner</div>
    </aside>
  );
}
