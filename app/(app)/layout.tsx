import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      {/* main content: min-w-0 prevents flex children from blowing out
          pb-18 leaves room for the fixed mobile bottom nav */}
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-out md:ml-[260px] pb-16 md:pb-0">
        {children}
        <MobileNav />
      </div>
    </div>
  );
}
