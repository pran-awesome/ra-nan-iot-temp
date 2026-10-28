import { NextResponse } from "next/server";
import { generateDeviceKey, hashDeviceKey, previewDeviceKey } from "@/lib/device-key";
import { createAdminClient, isServiceConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ deviceId: string }> };

export async function POST(_request: Request, context: Context) {
  if (!isServiceConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const { deviceId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const { data: owned } = await supabase
    .from("devices")
    .select("device_id, name")
    .eq("device_id", deviceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ ok: false, error: "Device not found." }, { status: 404 });
  }

  const uploadKey = generateDeviceKey();
  const admin = createAdminClient();
  const { error: keyError } = await admin
    .from("device_keys")
    .update({ api_key_hash: hashDeviceKey(uploadKey) })
    .eq("device_id", deviceId);

  if (keyError) {
    return NextResponse.json({ ok: false, error: "Could not rotate the key. Try again." }, { status: 500 });
  }

  const { error: previewError } = await admin
    .from("devices")
    .update({ api_key_preview: previewDeviceKey(uploadKey) })
    .eq("device_id", deviceId)
    .eq("user_id", user.id);

  if (previewError) {
    return NextResponse.json({ ok: false, error: "Could not rotate the key. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, device_id: deviceId, upload_key: uploadKey });
}
