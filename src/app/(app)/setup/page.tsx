import type { Metadata } from "next";
import { SetupView } from "@/components/setup-view";
import sketch from "../../../../firmware/smart_sop_puen/smart_sop_puen.ino";
import schema from "../../../../supabase/schema.sql";

export const metadata: Metadata = { title: "Setup guide" };

export default function SetupPage() {
  return <SetupView sketch={sketch} schema={schema} />;
}
