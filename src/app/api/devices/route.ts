import { NextResponse } from "next/server";
import { validateDeviceInput } from "@/lib/devices";
import { generateDeviceKey, hashDeviceKey, previewDeviceKey } from "@/lib/device-key";
import { createAdminClient, isServiceConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isServiceConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = validateDeviceInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= 100) {
    return NextResponse.json({ ok: false, error: "Device limit reached" }, { status: 400 });
  }

  const uploadKey = generateDeviceKey();
  const { error: deviceError } = await admin.from("devices").insert({
    user_id: user.id,
    device_id: parsed.value.deviceId,
    name: parsed.value.name,
    location: parsed.value.location,
    crop: parsed.value.crop,
    api_key_preview: previewDeviceKey(uploadKey),
    expected_interval_seconds: 300,
  });

  if (deviceError) {
    const duplicate = deviceError.code === "23505";
    return NextResponse.json(
      { ok: false, error: duplicate ? "That device ID is already registered." : "Could not register this device." },
      { status: duplicate ? 409 : 500 },
    );
  }

  const { error: keyError } = await admin.from("device_keys").insert({
    device_id: parsed.value.deviceId,
    api_key_hash: hashDeviceKey(uploadKey),
  });

  if (keyError) {
    await admin.from("devices").delete().eq("device_id", parsed.value.deviceId);
    return NextResponse.json({ ok: false, error: "Could not register this device." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    device_id: parsed.value.deviceId,
    upload_key: uploadKey,
  });
}
