import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "New password" };

export default function ResetPasswordPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <AuthScreen mode="reset" />;
}
