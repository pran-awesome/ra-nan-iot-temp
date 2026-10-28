export type MetricSpec = {
  key: string;
  field: string;
  label: string;
  unit: string;
  digits: number;
  minKey?: string;
  maxKey?: string;
};

export type MetricState = "ok" | "warn" | "missing" | "unknown";
export type Presence = "online" | "offline" | "unknown";

const OFFLINE_AFTER_MS = 10 * 60 * 1000;

export function readMetricValue(reading: object | null, field: string) {
  if (!reading) return null;
  const value = (reading as Record<string, unknown>)[field];
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function settingNumber(settings: object | null, key: string) {
  if (!settings) return Number.NaN;
  return Number((settings as Record<string, unknown>)[key]);
}

export function metricStatus(
  metric: MetricSpec,
  reading: object | null,
  settings: object | null,
): MetricState {
  if (!reading) return "unknown";
  const value = readMetricValue(reading, metric.field);
  if (value === null) return "missing";
  if (!metric.minKey || !metric.maxKey || !settings) return "ok";
  const min = settingNumber(settings, metric.minKey);
  const max = settingNumber(settings, metric.maxKey);
  if ((Number.isFinite(min) && value < min) || (Number.isFinite(max) && value > max)) {
    return "warn";
  }
  return "ok";
}

export function devicePresence(latestAt: string | null | undefined, now = Date.now()): Presence {
  if (!latestAt) return "unknown";
  const time = new Date(latestAt).getTime();
  if (!Number.isFinite(time)) return "unknown";
  return now - time <= OFFLINE_AFTER_MS ? "online" : "offline";
}

export type AlertItem = {
  id: string;
  tone: "alert" | "warn";
  title: string;
  detail: string;
  at: string | null;
};

export type AlertDevice = {
  id: string;
  name: string;
  latestAt: string | null;
  reading: object | null;
};

export function buildAlerts(
  devices: AlertDevice[],
  metrics: MetricSpec[],
  settings: object | null,
  now = Date.now(),
): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const device of devices) {
    const presence = devicePresence(device.latestAt, now);
    if (presence === "unknown") {
      alerts.push({
        id: `${device.id}-never`,
        tone: "alert",
        title: `${device.name} has not uploaded yet`,
        detail: "Flash the firmware with its upload key and power the unit on.",
        at: null,
      });
      continue;
    }

    if (presence === "offline") {
      alerts.push({
        id: `${device.id}-offline`,
        tone: "alert",
        title: `${device.name} is offline`,
        detail: "No upload for more than 10 minutes. Check power and Wi-Fi.",
        at: device.latestAt,
      });
    }

    for (const metric of metrics) {
      const state = metricStatus(metric, device.reading, settings);
      if (state === "missing") {
        alerts.push({
          id: `${device.id}-${metric.key}-missing`,
          tone: "alert",
          title: `${metric.label} not reported`,
          detail: `${device.name}: the latest upload did not include a valid value for this sensor.`,
          at: device.latestAt,
        });
      } else if (state === "warn" && metric.minKey && metric.maxKey && settings) {
        const value = readMetricValue(device.reading, metric.field);
        alerts.push({
          id: `${device.id}-${metric.key}`,
          tone: "warn",
          title: `${metric.label} outside your range`,
          detail: `${device.name}: now ${value} ${metric.unit}; your range is ${settingNumber(settings, metric.minKey)}–${settingNumber(settings, metric.maxKey)} ${metric.unit}.`,
          at: device.latestAt,
        });
      }
    }
  }

  return alerts;
}

export function countMissingUploads(rows: object[], metrics: MetricSpec[]) {
  return metrics.map((metric) => ({
    key: metric.key,
    label: metric.label,
    count: rows.filter((row) => readMetricValue(row, metric.field) === null).length,
  }));
}
