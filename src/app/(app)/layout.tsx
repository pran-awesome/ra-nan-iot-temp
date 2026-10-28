import { FarmProvider } from "@/components/farm-context";
import { SetupRequired } from "@/components/setup-required";
import { Shell } from "@/components/shell";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupRequired />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  return (
    <FarmProvider user={{ id: user.id, email: user.email ?? null, name }}>
      <Shell user={{ id: user.id, email: user.email ?? null, name }}>{children}</Shell>
    </FarmProvider>
  );
}
