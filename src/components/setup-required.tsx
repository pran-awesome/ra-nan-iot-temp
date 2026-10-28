export function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <img src="/logo.png" alt="" className="h-14 w-14 rounded-2xl border border-border object-cover" />
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smart Sop Puen</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Connect Supabase, then deploy to Vercel</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
        The dashboard is ready. It needs a Supabase project for accounts, devices and sensor readings. Add these environment variables and restart the server.
      </p>
      <ol className="mt-6 space-y-3 text-[13.5px] leading-relaxed">
        <li><span className="font-semibold">1.</span> Create a Supabase project and run <span className="font-mono text-[12px]">supabase/schema.sql</span> in the SQL editor.</li>
        <li><span className="font-semibold">2.</span> Copy the project URL, anon key and service-role key into <span className="font-mono text-[12px]">.env.local</span>.</li>
        <li><span className="font-semibold">3.</span> On Vercel, set the same three variables, deploy, then flash the ESP32 with <span className="font-mono text-[12px]">https://your-app.vercel.app/api/ingest</span>.</li>
      </ol>
      <pre className="mt-6 overflow-auto rounded-2xl bg-[#0d1b15] p-4 text-[12px] leading-relaxed text-emerald-50">{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=`}</pre>
    </main>
  );
}
