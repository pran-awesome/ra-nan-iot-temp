import { asNumber } from "@/lib/format";
import { DEFAULT_SETTINGS, type FarmSettings } from "@/lib/metrics";

export type Reading = {
  id: number;
  createdAt: string;
  soil_moisture_raw: number | null;
  soil_moisture_percent: number | null;
  water_raw: number | null;
  light_raw: number | null;
  air_temperature: number | null;
  air_humidity: number | null;
  missingFields: string[];
};

export type Device = {
  id: string;
  deviceId: string;
  name: string;
  location: string | null;
  crop: string | null;
  apiKeyPreview: string | null;
  expectedIntervalSeconds: number;
  createdAt: string;
  readings24h: number;
  latest: Reading | null;
};

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export function normalizeSettings(row: Record<string, unknown> | null): FarmSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  const refresh = Number(row.refresh_seconds);
  return {
    siteName: typeof row.site_name === "string" && row.site_name.trim() ? row.site_name : DEFAULT_SETTINGS.siteName,
    crop: typeof row.crop === "string" ? row.crop : DEFAULT_SETTINGS.crop,
    selectedDeviceId: typeof row.selected_device_id === "string" ? row.selected_device_id : null,
    moistureMin: asNumber(row.moisture_min) ?? DEFAULT_SETTINGS.moistureMin,
    moistureMax: asNumber(row.moisture_max) ?? DEFAULT_SETTINGS.moistureMax,
    airTempMin: asNumber(row.air_temp_min) ?? DEFAULT_SETTINGS.airTempMin,
    airTempMax: asNumber(row.air_temp_max) ?? DEFAULT_SETTINGS.airTempMax,
    humidityMin: asNumber(row.humidity_min) ?? DEFAULT_SETTINGS.humidityMin,
    humidityMax: asNumber(row.humidity_max) ?? DEFAULT_SETTINGS.humidityMax,
    refreshSeconds: [15, 30, 60, 120, 300].includes(refresh) ? refresh : DEFAULT_SETTINGS.refreshSeconds,
  };
}

export function settingsToRow(userId: string, settings: FarmSettings) {
  return {
    user_id: userId,
    site_name: settings.siteName,
    crop: settings.crop,
    selected_device_id: settings.selectedDeviceId,
    moisture_min: settings.moistureMin,
    moisture_max: settings.moistureMax,
    air_temp_min: settings.airTempMin,
    air_temp_max: settings.airTempMax,
    humidity_min: settings.humidityMin,
    humidity_max: settings.humidityMax,
    refresh_seconds: settings.refreshSeconds,
  };
}

export function normalizeDevice(row: Record<string, unknown>): Device {
  const latestAt = typeof row.latest_at === "string" ? row.latest_at : null;
  const latestId = asNumber(row.latest_id);
  const latest: Reading | null =
    latestAt && latestId != null
      ? {
          id: latestId,
          createdAt: latestAt,
          soil_moisture_raw: asNumber(row.soil_moisture_raw),
          soil_moisture_percent: asNumber(row.soil_moisture_percent),
          water_raw: asNumber(row.water_raw),
          light_raw: asNumber(row.light_raw),
          air_temperature: asNumber(row.air_temperature),
          air_humidity: asNumber(row.air_humidity),
          missingFields: Array.isArray(row.missing_fields) ? row.missing_fields.map(String) : [],
        }
      : null;

  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    name: String(row.name || row.device_id),
    location: typeof row.location === "string" ? row.location : null,
    crop: typeof row.crop === "string" ? row.crop : null,
    apiKeyPreview: typeof row.api_key_preview === "string" ? row.api_key_preview : null,
    expectedIntervalSeconds: asNumber(row.expected_interval_seconds) ?? 300,
    createdAt: String(row.created_at),
    readings24h: asNumber(row.readings_24h) ?? 0,
    latest,
  };
}
