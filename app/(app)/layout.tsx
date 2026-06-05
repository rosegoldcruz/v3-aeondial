import { Sidebar } from "@/components/shell/sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col transition-all duration-300 ease-out md:ml-[260px]">
        {children}
      </div>
    </div>
  );
}
