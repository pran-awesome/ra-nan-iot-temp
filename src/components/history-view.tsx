"use client";

import { ChevronLeft, ChevronRight, Download, LoaderCircle, Sprout } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFarm } from "@/components/farm-context";
import { TrendChart, type ChartPoint } from "@/components/trend-chart";
import { Button, PageHeader, SelectInput, Skeleton, cn } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { asNumber, formatChartLabel, formatNumber, formatStamp } from "@/lib/format";
import { METRICS, RANGES, STAT_KEYS, type RangeValue } from "@/lib/metrics";

type Row = {
  id: number;
  device_id: string;
  created_at: string;
  soil_moisture_percent: number | null;
  water_raw: number | null;
  light_raw: number | null;
  air_temperature: number | null;
  air_humidity: number | null;
};

const TABLE: Array<{ key: keyof Row; label: string; unit: string; digits: number }> = [
  { key: "soil_moisture_percent", label: "Soil moisture", unit: "%", digits: 1 },
  { key: "water_raw", label: "Water", unit: "raw", digits: 0 },
  { key: "light_raw", label: "Light", unit: "raw", digits: 0 },
  { key: "air_temperature", label: "Air temp", unit: "°C", digits: 1 },
  { key: "air_humidity", label: "Air humidity", unit: "%", digits: 1 },
];

function startOfDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function endOfDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

export function HistoryView() {
  const { devices, settings, loading: farmLoading } = useFarm();
  const [deviceId, setDeviceId] = useState("all");
  const [range, setRange] = useState<RangeValue>("24h");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cursors, setCursors] = useState<Array<number | null>>([null]);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [series, setSeries] = useState<Record<string, ChartPoint[]>>({});
  const [stats, setStats] = useState<Record<string, { avg: number | null; min: number | null; max: number | null; rows: number }>>({});
  const [chartLoading, setChartLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const appliedDefault = useRef(false);

  useEffect(() => {
    if (appliedDefault.current || farmLoading) return;
    appliedDefault.current = true;
    if (settings.selectedDeviceId && devices.some((device) => device.deviceId === settings.selectedDeviceId)) {
      setDeviceId(settings.selectedDeviceId);
    }
  }, [farmLoading, settings.selectedDeviceId, devices]);

  useEffect(() => {
    setCursors([null]);
    setPage(0);
  }, [deviceId, fromDate, toDate]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const spec = RANGES.find((item) => item.value === range)!;
    const from = new Date(Date.now() - spec.ms).toISOString();
    const to = new Date().toISOString();
    let cancelled = false;
    setChartLoading(true);
    void (async () => {
      const [seriesRes, statsRes] = await Promise.all([
        supabase.rpc("reading_series", {
          p_device_id: deviceId === "all" ? null : deviceId,
          p_from: from,
          p_to: to,
          p_bucket: spec.bucket,
        }),
        supabase.rpc("reading_stats", {
          p_device_id: deviceId === "all" ? null : deviceId,
          p_from: from,
          p_to: to,
        }),
      ]);
      if (cancelled) return;
      const points = (seriesRes.data ?? []) as Record<string, unknown>[];
      const next: Record<string, ChartPoint[]> = {};
      for (const metric of METRICS) {
        next[metric.key] = points.map((row) => ({
          label: formatChartLabel(String(row.t), range),
          value: asNumber(row[metric.field]),
        }));
      }
      setSeries(next);
      const statRow = Array.isArray(statsRes.data) ? (statsRes.data[0] as Record<string, unknown> | undefined) : null;
      const mapped: typeof stats = {};
      for (const metric of METRICS) {
        const [avg, min, max] = STAT_KEYS[metric.key as keyof typeof STAT_KEYS];
        mapped[metric.key] = {
          avg: asNumber(statRow?.[avg]),
          min: asNumber(statRow?.[min]),
          max: asNumber(statRow?.[max]),
          rows: asNumber(statRow?.rows) ?? 0,
        };
      }
      setStats(mapped);
      setChartLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, range]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const cursor = cursors[page];
    let cancelled = false;
    setTableLoading(true);
    void (async () => {
      let query = supabase
        .from("sensor_readings")
        .select("id, device_id, created_at, soil_moisture_percent, water_raw, light_raw, air_temperature, air_humidity", { count: page === 0 ? "exact" : undefined })
        .order("id", { ascending: false })
        .limit(21);
      if (deviceId !== "all") query = query.eq("device_id", deviceId);
      if (fromDate) query = query.gte("created_at", startOfDay(fromDate));
      if (toDate) query = query.lte("created_at", endOfDay(toDate));
      if (cursor) query = query.lt("id", cursor);
      const { data, count, error } = await query;
      if (cancelled) return;
      if (error) {
        setMessage(error.message);
        setRows([]);
      } else {
        const list = (data ?? []) as Row[];
        setHasMore(list.length > 20);
        setRows(list.slice(0, 20));
        if (page === 0) setTotal(count ?? list.length);
      }
      setTableLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId, fromDate, toDate, page, cursors]);

  const rangeLabel = RANGES.find((item) => item.value === range)?.label ?? range;

  async function exportCsv() {
    setExporting(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (deviceId !== "all") params.set("deviceId", deviceId);
      if (fromDate) params.set("from", startOfDay(fromDate));
      if (toDate) params.set("to", endOfDay(toDate));
      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `smart-sop-puen-readings-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const count = response.headers.get("X-Export-Count") ?? "0";
      setMessage(`Exported ${count} reading${count === "1" ? "" : "s"}.`);
    } catch {
      setMessage("Export failed. Try again in a moment.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Historical charts"
        title="Sensor history"
        description="Averaged readings across the selected period, followed by the individual uploads."
        actions={
          <SelectInput value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="w-auto font-semibold">
            <option value="all">All devices</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.name}</option>
            ))}
          </SelectInput>
        }
      />

      <section className="panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-border bg-card p-1" aria-label="Chart range">
            {RANGES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  range === item.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-[11.5px] text-muted-foreground">{chartLoading ? "Loading readings…" : `${stats.soil_moisture?.rows ?? 0} readings in range`}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {METRICS.map((metric) => {
            const summary = stats[metric.key];
            const points = series[metric.key] ?? [];
            return (
              <article key={metric.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <h2 className="text-[13.5px] font-semibold">{metric.label}</h2>
                  <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
                </div>
                {chartLoading ? <Skeleton className="h-52" /> : points.some((point) => point.value != null) ? (
                  <TrendChart data={points} unit={metric.unit} color={metric.chip} kind={metric.kind} domain={metric.domain} />
                ) : (
                  <div className="flex h-52 items-center justify-center text-[12.5px] text-muted-foreground">No readings in this range</div>
                )}
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {summary ? `Average ${formatNumber(summary.avg, metric.digits)} ${metric.unit} · low ${formatNumber(summary.min, metric.digits)} · high ${formatNumber(summary.max, metric.digits)}` : ""}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Uploads</h2>
            <p className="text-[12px] text-muted-foreground">Newest first · 20 rows per page</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-semibold">
              From date
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block rounded-xl border border-input bg-card px-3 py-2 text-[13px] font-normal" />
            </label>
            <label className="text-[12px] font-semibold">
              To date
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block rounded-xl border border-input bg-card px-3 py-2 text-[13px] font-normal" />
            </label>
            <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting}>
              {exporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" strokeWidth={2} />}
              Export CSV
            </Button>
          </div>
        </div>
        {message ? <p className="px-4 pt-3 text-[12.5px] text-muted-foreground">{message}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">When (ICT)</th>
                <th className="px-4 py-2.5 font-semibold">Device</th>
                {TABLE.map((column) => (
                  <th key={column.key} className="px-4 py-2.5 text-right font-semibold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8"><Skeleton className="h-8" /></td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                    <Sprout className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                    No readings match these filters. Widen the date range or pick another device.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-2.5 font-mono text-[11.5px]">{formatStamp(row.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground">{row.device_id}</span>
                    </td>
                    {TABLE.map((column) => {
                      const value = asNumber(row[column.key]);
                      return (
                        <td key={column.key} className="px-4 py-2.5 text-right">
                          {value == null ? (
                            <span className="text-[12px] text-muted-foreground" title="Sensor did not report">—</span>
                          ) : (
                            <span className="font-mono text-[12px] tabular-nums">
                              {formatNumber(value, column.digits)}
                              <span className="ml-0.5 text-[10px] text-muted-foreground">{column.unit}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-muted-foreground">
          <span>
            Page {page + 1}
            {total != null ? ` · ${total} matching` : ""}
            {!hasMore ? " · end of record" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!hasMore}
              onClick={() => {
                const last = rows[rows.length - 1];
                if (!last) return;
                setCursors((current) => {
                  const next = current.slice(0, page + 1);
                  next[page + 1] = last.id;
                  return next;
                });
                setPage((current) => current + 1);
              }}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
