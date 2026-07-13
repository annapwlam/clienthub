export default function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl bg-white shadow-sm lg:col-span-3" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
    </div>
  );
}
