import type { MetricSpec } from "@/lib/status";

export type Metric = MetricSpec & {
  hint: string;
  chip: string;
  kind: "area" | "line";
  domain?: [number, number];
  showProgress?: boolean;
};

export const METRICS: Metric[] = [
  {
    key: "soil_moisture",
    field: "soil_moisture_percent",
    label: "Soil moisture",
    unit: "%",
    digits: 1,
    minKey: "moistureMin",
    maxKey: "moistureMax",
    hint: "Calibrated estimate",
    chip: "hsl(154 46% 32%)",
    kind: "area",
    domain: [0, 100],
    showProgress: true,
  },
  {
    key: "air_temperature",
    field: "air_temperature",
    label: "Air temperature",
    unit: "°C",
    digits: 1,
    minKey: "airTempMin",
    maxKey: "airTempMax",
    hint: "DHT11 sensor",
    chip: "hsl(32 82% 52%)",
    kind: "line",
  },
  {
    key: "air_humidity",
    field: "air_humidity",
    label: "Air humidity",
    unit: "%",
    digits: 1,
    minKey: "humidityMin",
    maxKey: "humidityMax",
    hint: "DHT11 sensor",
    chip: "hsl(265 38% 58%)",
    kind: "line",
    domain: [0, 100],
    showProgress: true,
  },
  {
    key: "water",
    field: "water_raw",
    label: "Water sensor",
    unit: "raw",
    digits: 0,
    hint: "HW-038 raw analog reading",
    chip: "hsl(199 62% 42%)",
    kind: "line",
  },
  {
    key: "light",
    field: "light_raw",
    label: "Light level",
    unit: "raw",
    digits: 0,
    hint: "Uncalibrated LDR reading",
    chip: "hsl(4 66% 56%)",
    kind: "line",
  },
];

export const CROPS = [
  { value: "custom", label: "Custom field", thresholds: null },
  {
    value: "tomato",
    label: "Tomato",
    thresholds: { moistureMin: 55, moistureMax: 75, airTempMin: 18, airTempMax: 30, humidityMin: 60, humidityMax: 85 },
  },
  {
    value: "lettuce",
    label: "Lettuce",
    thresholds: { moistureMin: 55, moistureMax: 80, airTempMin: 12, airTempMax: 24, humidityMin: 55, humidityMax: 80 },
  },
  {
    value: "chilli",
    label: "Chilli",
    thresholds: { moistureMin: 45, moistureMax: 70, airTempMin: 20, airTempMax: 32, humidityMin: 50, humidityMax: 80 },
  },
  {
    value: "maize",
    label: "Maize",
    thresholds: { moistureMin: 45, moistureMax: 75, airTempMin: 18, airTempMax: 32, humidityMin: 50, humidityMax: 80 },
  },
  {
    value: "rice",
    label: "Rice",
    thresholds: { moistureMin: 70, moistureMax: 95, airTempMin: 22, airTempMax: 35, humidityMin: 60, humidityMax: 90 },
  },
  {
    value: "strawberry",
    label: "Strawberry",
    thresholds: { moistureMin: 50, moistureMax: 75, airTempMin: 12, airTempMax: 26, humidityMin: 55, humidityMax: 80 },
  },
] as const;

export const REFRESH_OPTIONS = [
  { value: 15, label: "Every 15 seconds" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every minute" },
  { value: 120, label: "Every 2 minutes" },
  { value: 300, label: "Every 5 minutes" },
];

export const RANGES = [
  { value: "1h", label: "Last hour", ms: 60 * 60 * 1000, bucket: "5 minutes" },
  { value: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000, bucket: "15 minutes" },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000, bucket: "2 hours" },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000, bucket: "8 hours" },
] as const;

export type RangeValue = (typeof RANGES)[number]["value"];

export const DEFAULT_SETTINGS = {
  siteName: "My farm",
  crop: "custom",
  selectedDeviceId: null as string | null,
  moistureMin: 40,
  moistureMax: 70,
  airTempMin: 16,
  airTempMax: 33,
  humidityMin: 50,
  humidityMax: 85,
  refreshSeconds: 30,
};

export type FarmSettings = typeof DEFAULT_SETTINGS;

export const THRESHOLD_FIELDS = [
  { label: "Soil moisture", unit: "%", minKey: "moistureMin", maxKey: "moistureMax", step: "0.1" },
  { label: "Air temperature", unit: "°C", minKey: "airTempMin", maxKey: "airTempMax", step: "0.1" },
  { label: "Air humidity", unit: "%", minKey: "humidityMin", maxKey: "humidityMax", step: "0.1" },
] as const;

export const STAT_KEYS = {
  soil_moisture: ["soil_avg", "soil_min", "soil_max"],
  air_temperature: ["temp_avg", "temp_min", "temp_max"],
  air_humidity: ["humidity_avg", "humidity_min", "humidity_max"],
  water: ["water_avg", "water_min", "water_max"],
  light: ["light_avg", "light_min", "light_max"],
} as const;
