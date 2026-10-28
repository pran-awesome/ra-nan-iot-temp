import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <AuthScreen mode="register" />;
}
