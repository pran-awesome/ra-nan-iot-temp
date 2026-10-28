export const SENSOR_FIELDS = [
  "soil_moisture_raw",
  "soil_moisture_percent",
  "water_raw",
  "light_raw",
  "air_temperature",
  "air_humidity",
] as const;

export type SensorField = (typeof SENSOR_FIELDS)[number];

export type IngestValue = {
  deviceId: string;
  soil_moisture_raw: number | null;
  soil_moisture_percent: number | null;
  water_raw: number | null;
  light_raw: number | null;
  air_temperature: number | null;
  air_humidity: number | null;
  storedFields: SensorField[];
  missingFields: SensorField[];
};

export type ParseResult =
  | { ok: true; value: IngestValue }
  | { ok: false; error: string };

const DEVICE_ID = /^[A-Za-z0-9_-]{3,64}$/;

const LIMITS: Record<SensorField, { min: number; max: number; decimals: number }> = {
  soil_moisture_raw: { min: 0, max: 8191, decimals: 0 },
  soil_moisture_percent: { min: 0, max: 100, decimals: 1 },
  water_raw: { min: 0, max: 8191, decimals: 0 },
  light_raw: { min: 0, max: 8191, decimals: 0 },
  air_temperature: { min: -40, max: 80, decimals: 1 },
  air_humidity: { min: 0, max: 100, decimals: 1 },
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function readNumber(value: unknown, field: SensorField): number | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return "invalid";
  const limits = LIMITS[field];
  if (numeric < limits.min || numeric > limits.max) return "invalid";
  return roundTo(numeric, limits.decimals);
}

export function parseIngestBody(body: unknown): ParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const deviceId = typeof record.device_id === "string" ? record.device_id.trim() : "";
  if (!DEVICE_ID.test(deviceId)) {
    return {
      ok: false,
      error: "device_id must be 3–64 characters: letters, numbers, dashes or underscores",
    };
  }

  const value = {
    deviceId,
    storedFields: [] as SensorField[],
    missingFields: [] as SensorField[],
  } as IngestValue;

  for (const field of SENSOR_FIELDS) {
    const parsed = readNumber(record[field], field);
    if (parsed === "invalid" || parsed === null) {
      value[field] = null;
      value.missingFields.push(field);
    } else {
      value[field] = parsed;
      value.storedFields.push(field);
    }
  }

  return { ok: true, value };
}
