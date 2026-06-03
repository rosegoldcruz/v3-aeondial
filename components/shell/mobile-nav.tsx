"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav-config";

export function MobileNav() {
  const path = usePathname();
  const items = NAV.filter((n) =>
    ["/crm/dashboard", "/sales/overview", "/dialer/live", "/finance/dashboard", "/agent/code"].includes(n.href)
  );
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-secondary">
      {items.map((item) => {
        const active = path === item.href || path.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 py-2 ${active ? "text-accent" : "text-muted-foreground"}`}>
            <Icon size={18} strokeWidth={1.75} />
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
