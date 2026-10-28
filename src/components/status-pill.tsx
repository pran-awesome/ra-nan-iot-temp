import { cn } from "@/components/ui";
import type { MetricState, Presence } from "@/lib/status";

const PRESENCE = {
  online: { label: "Online", wrap: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
  offline: { label: "Offline", wrap: "bg-rose-50 text-rose-800 ring-rose-600/20", dot: "bg-rose-500" },
  unknown: { label: "No data", wrap: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/50" },
} as const;

const RANGE = {
  ok: { label: "In range", wrap: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
  warn: { label: "Out of range", wrap: "bg-amber-50 text-amber-900 ring-amber-600/20", dot: "bg-amber-500" },
  missing: { label: "Alert", wrap: "bg-rose-50 text-rose-800 ring-rose-600/20", dot: "bg-rose-500" },
  unknown: { label: "No data", wrap: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/50" },
} as const;

export function StatusPill({
  status,
  pulse = false,
  kind = "presence",
}: {
  status: Presence | MetricState;
  pulse?: boolean;
  kind?: "presence" | "range";
}) {
  const tone = kind === "range"
    ? RANGE[status as MetricState] ?? RANGE.unknown
    : PRESENCE[status as Presence] ?? PRESENCE.unknown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset", tone.wrap)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse ? <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", tone.dot)} /> : null}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", tone.dot)} />
      </span>
      {tone.label}
    </span>
  );
}
