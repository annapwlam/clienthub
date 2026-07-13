import Link from "next/link";

export default function LeadNotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <p className="text-3xl">🔍</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">Lead not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        This lead doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/leads"
        className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Back to pipeline
      </Link>
    </div>
  );
}
