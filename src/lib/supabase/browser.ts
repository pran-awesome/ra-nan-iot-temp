import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config";

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabase() {
  if (browserClient) return browserClient;
  const { url, anonKey } = publicEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
