export default function AppLoading() {
  return (
    <div className="flex-1 min-w-0 p-4 md:p-6">
      <div className="h-10 w-56 rounded-lg bg-secondary/70 animate-pulse mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="h-72 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-72 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    </div>
  );
}
