import { STAGE_LABELS, type Stage } from "@/lib/types";

const STAGE_STYLES: Record<Stage, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  proposal: "bg-amber-50 text-amber-700 ring-amber-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STAGE_STYLES[stage] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const tone =
    score >= 70
      ? "bg-emerald-100 text-emerald-800"
      : score >= 40
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-600";
  return (
    <span
      title={`Lead score: ${score}/100 (rule engine)`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      ⚡ {Math.round(score)}
    </span>
  );
}
