const TIME_ZONE = "Asia/Bangkok";

export function formatNumber(value: number | null | undefined, digits: number) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (digits === 0) return Math.round(value).toLocaleString("en-GB");
  return value.toFixed(digits);
}

export function formatStamp(iso: string | null | undefined, style: "time" | "date" | "both" = "both") {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (style === "time") {
    return date.toLocaleTimeString("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  }
  if (style === "date") {
    return date.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, day: "2-digit", month: "short" });
  }
  return date.toLocaleString("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChartLabel(iso: string, range: string) {
  return formatStamp(iso, range === "1h" || range === "24h" ? "time" : "date");
}

export function formatAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "Waiting for the first upload";
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "Waiting for the first upload";
  const stamp = formatStamp(iso);
  const minutes = Math.round((now - time) / 60000);
  if (minutes < 1) return `just now · ${stamp} ICT`;
  if (minutes < 60) return `${minutes} min ago · ${stamp} ICT`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago · ${stamp} ICT`;
  return `${stamp} ICT`;
}

export function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

export function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
