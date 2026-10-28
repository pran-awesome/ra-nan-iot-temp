export function publicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = publicEnv();
  return url.startsWith("https://") && anonKey.length > 20;
}
