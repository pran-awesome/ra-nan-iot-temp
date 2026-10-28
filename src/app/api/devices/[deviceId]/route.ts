import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ deviceId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { deviceId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("devices")
    .delete()
    .eq("device_id", deviceId)
    .eq("user_id", user.id)
    .select("device_id");

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not remove the device." }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ ok: false, error: "Device not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
