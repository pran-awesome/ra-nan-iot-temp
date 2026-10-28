"use client";

import Link from "next/link";
import { Droplet, Droplets, RefreshCw, Sprout, Sun, Thermometer, TriangleAlert, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useFarm } from "@/components/farm-context";
import { StatusPill } from "@/components/status-pill";
import { TrendChart, type ChartPoint } from "@/components/trend-chart";
import { Button, EmptyState, PageHeader, SelectInput, Skeleton, cn } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { formatAgo, formatChartLabel, formatNumber } from "@/lib/format";
import { METRICS, RANGES, STAT_KEYS, type Metric } from "@/lib/metrics";
import { devicePresence, metricStatus, readMetricValue } from "@/lib/status";

const ICONS: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  soil_moisture: Droplets,
  air_temperature: Thermometer,
  air_humidity: Droplet,
  water: Waves,
  light: Sun,
};

function DevicePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { devices } = useFarm();
  if (devices.length === 0) return null;
  return (
    <SelectInput value={value} onChange={(event) => onChange(event.target.value)} className="w-auto font-semibold">
      <option value="all">All devices</option>
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.name}
        </option>
      ))}
    </SelectInput>
  );
}

function MetricCard({ metric, reading, settings }: { metric: Metric; reading: object | null; settings: object }) {
  const Icon = ICONS[metric.key] ?? Sprout;
  const state = metricStatus(metric, reading, settings);
  const value = readMetricValue(reading, metric.field);
  const attention = state === "warn" || state === "missing";
  return (
    <article
      className={cn(
        "panel relative flex flex-col justify-between overflow-hidden p-5",
        state === "warn" && "border-amber-300/80",
        state === "missing" && "border-rose-300/80",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", attention ? "bg-amber-100 text-amber-800" : "bg-accent text-primary")}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-tight text-muted-foreground">{metric.label}</div>
              {state === "warn" ? (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Outside configured range
                </div>
              ) : null}
              {state === "missing" ? (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Out of range or missing
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className={cn("font-mono text-[30px] font-medium leading-none tabular-nums tracking-tight", value == null && "text-muted-foreground/50")}>
            {formatNumber(value, metric.digits)}
          </span>
          {value != null ? <span className="text-[13px] text-muted-foreground">{metric.unit}</span> : null}
        </div>
        {metric.showProgress && value != null ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-[11.5px] text-muted-foreground">{value == null ? "Sensor did not report" : metric.hint}</div>
    </article>
  );
}

export function DashboardView() {
  const { settings, devices, loading, refreshing, error, refresh } = useFarm();
  const [picked, setPicked] = useState<string | null>(null);
  const [series, setSeries] = useState<Record<string, ChartPoint[]>>({});
  const [stats, setStats] = useState<Record<string, { avg: number | null; min: number | null; max: number | null }>>({});
  const [chartError, setChartError] = useState<string | null>(null);

  const selected = picked ?? (settings.selectedDeviceId && devices.some((device) => device.deviceId === settings.selectedDeviceId) ? settings.selectedDeviceId : "all");
  const scoped = selected === "all" ? devices : devices.filter((device) => device.deviceId === selected);
  const latestDevice = [...scoped].sort((a, b) => (b.latest?.createdAt ?? "").localeCompare(a.latest?.createdAt ?? ""))[0];
  const latest = latestDevice?.latest ?? null;
  const presence = selected === "all"
    ? devices.length === 0
      ? "unknown"
      : devices.every((device) => devicePresence(device.latest?.createdAt) === "online")
        ? "online"
        : devices.some((device) => devicePresence(device.latest?.createdAt) === "offline")
          ? "offline"
          : "unknown"
    : devicePresence(latest?.createdAt);
  const active = scoped[0];
  const intervalMinutes = Math.round((active?.expectedIntervalSeconds ?? 300) / 60);

  const problems = useMemo(() => {
    if (!latest) return { warn: [] as Metric[], missing: [] as Metric[] };
    return {
      warn: METRICS.filter((metric) => metricStatus(metric, latest, settings) === "warn"),
      missing: METRICS.filter((metric) => metricStatus(metric, latest, settings) === "missing"),
    };
  }, [latest, settings]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const range = RANGES.find((item) => item.value === "24h")!;
    const from = new Date(Date.now() - range.ms).toISOString();
    const to = new Date().toISOString();
    let cancelled = false;
    void (async () => {
      const [seriesRes, statsRes] = await Promise.all([
        supabase.rpc("reading_series", {
          p_device_id: selected === "all" ? null : selected,
          p_from: from,
          p_to: to,
          p_bucket: range.bucket,
        }),
        supabase.rpc("reading_stats", {
          p_device_id: selected === "all" ? null : selected,
          p_from: from,
          p_to: to,
        }),
      ]);
      if (cancelled) return;
      if (seriesRes.error || statsRes.error) {
        setChartError(seriesRes.error?.message || statsRes.error?.message || "Could not load history");
        return;
      }
      setChartError(null);
      const rows = (seriesRes.data ?? []) as Record<string, unknown>[];
      const next: Record<string, ChartPoint[]> = {};
      for (const metric of METRICS) {
        next[metric.key] = rows.map((row) => ({
          label: formatChartLabel(String(row.t), "24h"),
          value: row[metric.field] == null ? null : Number(row[metric.field]),
        }));
      }
      setSeries(next);
      const statRow = Array.isArray(statsRes.data) ? (statsRes.data[0] as Record<string, unknown> | undefined) : (statsRes.data as Record<string, unknown> | null);
      const mapped: typeof stats = {};
      for (const metric of METRICS) {
        const [avg, min, max] = STAT_KEYS[metric.key as keyof typeof STAT_KEYS];
        mapped[metric.key] = {
          avg: statRow?.[avg] == null ? null : Number(statRow[avg]),
          min: statRow?.[min] == null ? null : Number(statRow[min]),
          max: statRow?.[max] == null ? null : Number(statRow[max]),
        };
      }
      setStats(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, devices, refreshing]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={settings.siteName || "Field overview"}
        title="Live conditions"
        description={
          <>
            {selected === "all" ? "All devices" : `${active?.name ?? selected} · ${selected}`}
            {` · readings every ${intervalMinutes} minutes`}
            {latest ? ` · last upload ${formatAgo(latest.createdAt)}` : ""}
          </>
        }
        actions={
          <>
            <DevicePicker value={selected} onChange={setPicked} />
            <StatusPill status={presence} pulse={presence === "online"} />
            <Button variant="secondary" onClick={() => void refresh(true)}>
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} strokeWidth={2} />
              Refresh
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <div className="panel p-6">
          <h2 className="text-[16px] font-semibold">Couldn’t load sensor readings</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">The database did not respond. Check your connection and try again.</p>
          <Button className="mt-4" onClick={() => void refresh()}>Try again</Button>
        </div>
      ) : !latest ? (
        <EmptyState
          icon={<Sprout className="h-5 w-5" />}
          title="No readings yet"
          description="The dashboard fills in as soon as your ESP32 uploads its first reading. Register the device, copy its upload key into the firmware, and the values appear here within one upload interval."
          actionLabel="Connect a device"
          actionTo="/setup"
        />
      ) : (
        <>
          {(problems.warn.length > 0 || problems.missing.length > 0) && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[13px] text-amber-950">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
              <div>
                {problems.warn.length > 0 ? (
                  <p>
                    <span className="font-semibold">{problems.warn.map((metric) => metric.label).join(", ")}</span>
                    {" outside your configured range. "}
                    {problems.warn
                      .map((metric) => {
                        const value = readMetricValue(latest, metric.field);
                        const bag = settings as unknown as Record<string, number>;
                      return `${formatNumber(value, metric.digits)} ${metric.unit} vs ${bag[metric.minKey!]}–${bag[metric.maxKey!]} ${metric.unit}`;
                      })
                      .join("; ")}
                  </p>
                ) : null}
                {problems.missing.length > 0 ? (
                  <p className={problems.warn.length ? "mt-1" : ""}>
                    {problems.missing.map((metric) => metric.label).join(", ")} not reported in the latest upload.{" "}
                    <Link href="/alerts" className="font-semibold underline underline-offset-2">Adjust thresholds</Link>
                  </p>
                ) : (
                  <Link href="/settings" className="mt-1 inline-block font-semibold underline underline-offset-2">Adjust thresholds</Link>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {METRICS.map((metric) => (
              <MetricCard key={metric.key} metric={metric} reading={latest} settings={settings} />
            ))}
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold">Last 24 hours</h2>
                <p className="text-[12.5px] text-muted-foreground">Averaged into 15-minute buckets. Times are Indochina Time (ICT).</p>
              </div>
              <Link href="/history" className="text-[12.5px] font-semibold text-primary underline underline-offset-2">Open full history</Link>
            </div>
            {chartError ? <p className="text-[12.5px] text-rose-700">{chartError}</p> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              {METRICS.map((metric) => {
                const summary = stats[metric.key];
                return (
                  <article key={metric.key} className="panel p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-[13.5px] font-semibold">{metric.label}</h3>
                      <span className="text-[11.5px] text-muted-foreground">
                        {summary ? `Average ${formatNumber(summary.avg, metric.digits)} ${metric.unit} · low ${formatNumber(summary.min, metric.digits)} · high ${formatNumber(summary.max, metric.digits)}` : "Loading readings…"}
                      </span>
                    </div>
                    {(series[metric.key] ?? []).some((point) => point.value != null) ? (
                      <TrendChart data={series[metric.key] ?? []} unit={metric.unit} color={metric.chip} kind={metric.kind} domain={metric.domain} />
                    ) : (
                      <div className="flex h-52 items-center justify-center text-[12.5px] text-muted-foreground">No readings in the last 24 hours</div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Soil moisture is a calibrated estimate from your probe, not a universal measure of water content. Water and light values are raw HW-038 / LDR analog readings (0–4095) unless the sensor is calibrated.
          </p>
        </>
      )}
    </div>
  );
}
