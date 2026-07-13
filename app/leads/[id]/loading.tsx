export default function LoadingLeadDetail() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    </div>
  );
}
