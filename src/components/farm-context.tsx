"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { DEFAULT_SETTINGS, type FarmSettings } from "@/lib/metrics";
import { normalizeDevice, normalizeSettings, settingsToRow, type Device, type SessionUser } from "@/lib/types";

type FarmContextValue = {
  user: SessionUser;
  settings: FarmSettings;
  devices: Device[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (manual?: boolean) => Promise<void>;
  saveSettings: (next: FarmSettings) => Promise<string | null>;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const refresh = useCallback(async (manual = false) => {
    if (inflight.current) return;
    inflight.current = true;
    if (manual) setRefreshing(true);
    try {
      const [settingsRes, devicesRes] = await Promise.all([
        supabase.from("farm_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("device_overview").select("*").order("created_at", { ascending: true }),
      ]);
      if (settingsRes.error || devicesRes.error) {
        setError(settingsRes.error?.message || devicesRes.error?.message || "The database did not respond.");
      } else {
        setError(null);
        setSettings(normalizeSettings(settingsRes.data as Record<string, unknown> | null));
        setDevices(((devicesRes.data ?? []) as Record<string, unknown>[]).map(normalizeDevice));
      }
    } finally {
      inflight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, settings.refreshSeconds * 1000);
    const channel = supabase
      .channel(`farm-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sensor_readings" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [refresh, settings.refreshSeconds, supabase, user.id]);

  const saveSettings = useCallback(
    async (next: FarmSettings) => {
      const { error: saveError } = await supabase.from("farm_settings").upsert(settingsToRow(user.id, next));
      if (saveError) return saveError.message || "Could not save settings. Try again.";
      setSettings(next);
      return null;
    },
    [supabase, user.id],
  );

  const value = useMemo(
    () => ({ user, settings, devices, loading, refreshing, error, refresh, saveSettings }),
    [user, settings, devices, loading, refreshing, error, refresh, saveSettings],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const value = useContext(FarmContext);
  if (!value) throw new Error("useFarm must be used inside FarmProvider");
  return value;
}
