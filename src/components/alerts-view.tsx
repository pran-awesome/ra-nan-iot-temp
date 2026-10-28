"use client";

import Link from "next/link";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarm } from "@/components/farm-context";
import { Button, PageHeader, Skeleton, cn } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { formatStamp } from "@/lib/format";
import { METRICS } from "@/lib/metrics";
import { buildAlerts, countMissingUploads } from "@/lib/status";

export function AlertsView() {
  const { devices, settings, loading } = useFarm();
  const [rows, setRows] = useState<object[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const alerts = useMemo(
    () => buildAlerts(
      devices.map((device) => ({
        id: device.deviceId,
        name: device.name,
        latestAt: device.latest?.createdAt ?? null,
        reading: device.latest,
      })),
      METRICS,
      settings,
    ),
    [devices, settings],
  );

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("sensor_readings")
        .select("soil_moisture_percent, air_temperature, air_humidity, water_raw, light_raw, created_at")
        .gte("created_at", since)
        .limit(5000);
      if (!cancelled) {
        setRows(data ?? []);
        setRowsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [devices]);

  const missing = countMissingUploads(rows, METRICS).filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Watch"
        title="Active warnings"
        description="Readings outside your configured thresholds, plus devices and sensors that stopped reporting."
        actions={<Button variant="secondary" onClick={() => { window.location.href = "/settings"; }}>Edit thresholds</Button>}
      />

      {loading ? <Skeleton className="h-28" /> : alerts.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><ShieldCheck className="h-5 w-5" /></span>
          <h2 className="mt-4 text-[15px] font-semibold">All clear</h2>
          <p className="mt-1 max-w-md text-[13px] text-muted-foreground">Every registered device is reporting, and all readings sit inside your configured ranges.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <article key={alert.id} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", alert.tone === "alert" ? "border-rose-200 bg-rose-50/70" : "border-amber-200 bg-amber-50/70")}>
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold">{alert.title}</h2>
                <p className="mt-0.5 text-[13px] text-foreground/80">{alert.detail}</p>
              </div>
              {alert.at ? <time className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{formatStamp(alert.at)} ICT</time> : null}
            </article>
          ))}
        </div>
      )}

      <section className="panel p-5">
        <h2 className="text-[15px] font-semibold">Sensor problems · last 24 hours</h2>
        {rowsLoading ? <Skeleton className="mt-3 h-10" /> : missing.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">No uploads in the last 24 hours reported a missing or invalid sensor value.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {missing.map((item) => (
              <li key={item.key} className="flex items-center justify-between py-2 text-[13px]">
                <span>{item.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{item.count} missing in an upload</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Smart Sop Puen Smart Farm only reports conditions — it never switches irrigation or other equipment. Thresholds are the ones you set for your own crop and field.{" "}
        <Link href="/settings" className="font-semibold text-primary underline underline-offset-2">Edit thresholds</Link>
      </p>
    </div>
  );
}
