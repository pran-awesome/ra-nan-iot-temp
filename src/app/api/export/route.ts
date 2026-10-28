import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "created_at",
  "device_id",
  "soil_moisture_percent",
  "soil_moisture_raw",
  "water_raw",
  "light_raw",
  "air_temperature",
  "air_humidity",
  "missing_fields",
] as const;

function cell(value: unknown) {
  if (value == null) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  if (/[",\n\r]/.test(text) || /^[=+\-@]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("sensor_readings")
    .select(COLUMNS.join(","))
    .order("created_at", { ascending: false })
    .limit(20000);

  if (deviceId && deviceId !== "all") query = query.eq("device_id", deviceId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "Export failed. Try again in a moment." }, { status: 500 });
  }

  const rows = data ?? [];
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    const record = row as unknown as Record<string, unknown>;
    lines.push(COLUMNS.map((column) => cell(record[column])).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="smart-sop-puen-readings-${today}.csv"`,
      "X-Export-Count": String(rows.length),
      "X-Export-Truncated": rows.length >= 20000 ? "true" : "false",
    },
  });
}
