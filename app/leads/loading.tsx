export default function LoadingLeads() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-slate-100 p-2">
            <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="h-20 animate-pulse rounded-lg bg-white shadow-sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
