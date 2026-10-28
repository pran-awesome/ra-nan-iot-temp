import assert from "node:assert/strict";
import test from "node:test";
import { parseIngestBody } from "../src/lib/ingest.ts";
import { validateDeviceInput } from "../src/lib/devices.ts";
import { buildAlerts, countMissingUploads, devicePresence, metricStatus } from "../src/lib/status.ts";

const soil = {
  key: "soil_moisture",
  field: "soil_moisture_percent",
  label: "Soil moisture",
  unit: "%",
  digits: 1,
  minKey: "moistureMin",
  maxKey: "moistureMax",
};

test("accepts a full ESP32 payload", () => {
  const parsed = parseIngestBody({
    device_id: "farm_001",
    soil_moisture_raw: 2200,
    soil_moisture_percent: 62.54,
    water_raw: 1800,
    light_raw: 2450,
    air_temperature: 31.24,
    air_humidity: 75,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.soil_moisture_percent, 62.5);
  assert.equal(parsed.value.air_temperature, 31.2);
  assert.deepEqual(parsed.value.missingFields, []);
});

test("treats null and omitted DHT values as missing", () => {
  const parsed = parseIngestBody({
    device_id: "farm_001",
    soil_moisture_raw: 2200,
    soil_moisture_percent: 40,
    water_raw: 10,
    light_raw: 10,
    air_temperature: null,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.air_temperature, null);
  assert.equal(parsed.value.air_humidity, null);
  assert.ok(parsed.value.missingFields.includes("air_temperature"));
  assert.ok(parsed.value.missingFields.includes("air_humidity"));
});

test("rejects a bad device id and out-of-range numbers", () => {
  assert.equal(parseIngestBody({ device_id: "x" }).ok, false);
  const parsed = parseIngestBody({
    device_id: "farm_001",
    soil_moisture_percent: 140,
    air_temperature: "hot",
    water_raw: 100,
    light_raw: 100,
    soil_moisture_raw: 100,
    air_humidity: 50,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.soil_moisture_percent, null);
  assert.equal(parsed.value.air_temperature, null);
  assert.ok(parsed.value.missingFields.includes("soil_moisture_percent"));
});

test("validates device registration", () => {
  assert.equal(validateDeviceInput({ device_id: "no", name: "A" }).ok, false);
  const parsed = validateDeviceInput({ device_id: "farm_001", name: " North ", location: "", crop: "Tomato" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.name, "North");
  assert.equal(parsed.value.location, null);
  assert.equal(parsed.value.crop, "Tomato");
});

test("marks a device offline after 10 minutes and warns outside the range", () => {
  const now = Date.parse("2026-10-28T07:00:00Z");
  assert.equal(devicePresence("2026-10-28T06:55:00Z", now), "online");
  assert.equal(devicePresence("2026-10-28T06:40:00Z", now), "offline");
  assert.equal(devicePresence(null, now), "unknown");
  assert.equal(metricStatus(soil, { soil_moisture_percent: 20 }, { moistureMin: 40, moistureMax: 70 }), "warn");
  assert.equal(metricStatus(soil, { soil_moisture_percent: null }, { moistureMin: 40, moistureMax: 70 }), "missing");
  assert.equal(metricStatus(soil, { soil_moisture_percent: 55 }, { moistureMin: 40, moistureMax: 70 }), "ok");
});

test("builds offline and missing alerts", () => {
  const now = Date.parse("2026-10-28T07:00:00Z");
  const alerts = buildAlerts(
    [
      { id: "a", name: "North", latestAt: null, reading: null },
      { id: "b", name: "South", latestAt: "2026-10-28T06:20:00Z", reading: { soil_moisture_percent: null } },
    ],
    [soil],
    { moistureMin: 40, moistureMax: 70 },
    now,
  );
  assert.equal(alerts[0]?.title, "North has not uploaded yet");
  assert.ok(alerts.some((alert) => alert.title === "South is offline"));
  assert.ok(alerts.some((alert) => alert.title === "Soil moisture not reported"));
  const counts = countMissingUploads([{ soil_moisture_percent: null }, { soil_moisture_percent: 10 }], [soil]);
  assert.equal(counts[0]?.count, 1);
});
