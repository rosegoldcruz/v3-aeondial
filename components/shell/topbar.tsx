"use client";
export function Topbar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-8 h-16 border-b border-line bg-bg/80 backdrop-blur">
      <h1 className="text-base md:text-lg font-medium text-ink tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
