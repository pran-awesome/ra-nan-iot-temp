"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, TextInput } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AuthScreen({ mode }: { mode: "login" | "register" | "forgot" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setPending(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    if (mode === "register") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      setPending(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      setInfo("Check your email to confirm the account, then sign in.");
      return;
    }

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
      setPending(false);
      if (resetError) setError(resetError.message);
      else setInfo("If that email is registered, a reset link is on its way.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) setError(updateError.message);
    else {
      setInfo("Password updated.");
      router.push("/");
      router.refresh();
    }
  }

  async function google() {
    setError(null);
    const supabase = createBrowserSupabase();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  const title = mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Welcome back";
  const submit = mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Log in";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden flex-col justify-between bg-[#143528] px-12 py-10 text-emerald-50 lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-2xl bg-[#f6f3ea] object-cover" />
          <div>
            <div className="text-[18px] font-extrabold tracking-tight">Smart Sop Puen</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">Smart farm</div>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Soil, water, light and air — from the field, on your desk.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-emerald-50/80">
            ESP32 nodes upload every five minutes. This dashboard only reports conditions. It never switches irrigation or other equipment.
          </p>
        </div>
        <p className="text-[12px] text-emerald-50/60">Times on the dashboard use Indochina Time.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl border border-border object-cover" />
            <div className="text-[16px] font-extrabold">Smart Sop Puen</div>
          </div>
          <h2 className="text-[26px] font-extrabold tracking-tight">{title}</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {mode === "login" ? "Log in to your account" : "Smart Sop Puen Smart Farm"}
          </p>

          {mode === "login" || mode === "register" ? (
            <>
              <button type="button" onClick={() => void google()} className="mt-6 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] font-semibold hover:bg-muted">
                Continue with Google
              </button>
              <div className="my-4 text-center text-[12px] text-muted-foreground">or</div>
            </>
          ) : null}

          <form className="space-y-3" onSubmit={onSubmit}>
            {mode !== "reset" ? (
              <label className="block text-[12.5px] font-semibold">
                Email
                <TextInput className="mt-1.5" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
            ) : null}
            {mode !== "forgot" ? (
              <label className="block text-[12.5px] font-semibold">
                Password
                <TextInput className="mt-1.5" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
            ) : null}
            {mode === "login" ? (
              <div className="text-right">
                <Link href="/forgot-password" className="text-[12.5px] font-semibold text-primary">Forgot password?</Link>
              </div>
            ) : null}
            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">{error}</p> : null}
            {info ? <p className="rounded-xl bg-accent px-3 py-2 text-[12.5px] text-accent-foreground">{info}</p> : null}
            <Button type="submit" className="w-full py-2.5" disabled={pending}>{pending ? "Please wait…" : submit}</Button>
          </form>

          <p className="mt-5 text-[13px] text-muted-foreground">
            {mode === "login" ? (
              <>Don't have an account? <Link href="/register" className="font-semibold text-primary">Create one</Link></>
            ) : (
              <>Already registered? <Link href="/login" className="font-semibold text-primary">Log in</Link></>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
