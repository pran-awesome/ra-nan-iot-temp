import { NextResponse } from "next/server";
import { hashDeviceKey } from "@/lib/device-key";
import { parseIngestBody } from "@/lib/ingest";
import { createAdminClient, isServiceConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isServiceConfigured()) {
    return NextResponse.json({ ok: false, error: "Ingest is not configured" }, { status: 503 });
  }

  const apiKey = request.headers.get("x-api-key")?.trim() ?? "";
  if (!apiKey || apiKey.length > 200) {
    return NextResponse.json({ ok: false, error: "Missing or invalid x-api-key" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 8000) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = parseIngestBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: keyRow, error: keyError } = await admin
    .from("device_keys")
    .select("device_id")
    .eq("api_key_hash", hashDeviceKey(apiKey))
    .maybeSingle();

  if (keyError) {
    return NextResponse.json({ ok: false, error: "Could not verify the device key" }, { status: 500 });
  }
  if (!keyRow) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (keyRow.device_id !== parsed.value.deviceId) {
    return NextResponse.json(
      { ok: false, error: "device_id does not match this upload key" },
      { status: 403 },
    );
  }

  const reading = parsed.value;
  const { data: inserted, error: insertError } = await admin
    .from("sensor_readings")
    .insert({
      device_id: reading.deviceId,
      soil_moisture_raw: reading.soil_moisture_raw,
      soil_moisture_percent: reading.soil_moisture_percent,
      water_raw: reading.water_raw,
      light_raw: reading.light_raw,
      air_temperature: reading.air_temperature,
      air_humidity: reading.air_humidity,
      missing_fields: reading.missingFields,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ ok: false, error: "Could not store the reading" }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      reading_id: inserted.id,
      received_at: inserted.created_at,
      stored: reading.storedFields,
      missing_fields: reading.missingFields,
    },
    { status: 201 },
  );
}
