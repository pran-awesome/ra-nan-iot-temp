import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <AuthScreen mode="login" />;
}
