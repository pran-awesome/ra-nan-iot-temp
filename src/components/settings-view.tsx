"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useFarm } from "@/components/farm-context";
import { Button, Label, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { CROPS, REFRESH_OPTIONS, THRESHOLD_FIELDS, type FarmSettings } from "@/lib/metrics";

export function SettingsView() {
  const { settings, devices, saveSettings, loading } = useFarm();
  const [draft, setDraft] = useState<FarmSettings>(settings);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);

  function updateNumber(key: keyof FarmSettings, value: string) {
    setDraft((current) => ({ ...current, [key]: Number(value) }));
  }

  function applyCrop(crop: string) {
    const preset = CROPS.find((item) => item.value === crop);
    setDraft((current) => ({
      ...current,
      crop,
      ...(preset?.thresholds ?? {}),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!(draft.moistureMin < draft.moistureMax)) {
      setError("Soil moisture minimum must be below its maximum.");
      return;
    }
    if (!(draft.airTempMin < draft.airTempMax)) {
      setError("Air temperature minimum must be below its maximum.");
      return;
    }
    if (!(draft.humidityMin < draft.humidityMax)) {
      setError("Humidity minimum must be below its maximum.");
      return;
    }
    setPending(true);
    const saveError = await saveSettings({
      ...draft,
      siteName: draft.siteName.trim() || "My farm",
      selectedDeviceId: draft.selectedDeviceId || null,
    });
    setPending(false);
    if (saveError) setError("Could not save settings. Try again.");
    else setMessage("Settings saved.");
  }

  if (loading) return <div className="panel h-40 animate-pulse bg-primary/10" />;

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Your thresholds, crop preset and refresh interval. These are personal to your account."
      />

      <section className="panel space-y-4 p-5">
        <p className="text-[13px] text-muted-foreground">Names the dashboard and picks the device it opens with.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <Label>Site name</Label>
            <TextInput value={draft.siteName} onChange={(event) => setDraft({ ...draft, siteName: event.target.value })} />
          </label>
          <label className="block">
            <Label>Crop preset</Label>
            <SelectInput value={draft.crop} onChange={(event) => applyCrop(event.target.value)}>
              {CROPS.map((crop) => <option key={crop.value} value={crop.value}>{crop.label}</option>)}
            </SelectInput>
          </label>
          <label className="block">
            <Label>Default device</Label>
            <SelectInput
              value={draft.selectedDeviceId ?? "all"}
              onChange={(event) => setDraft({ ...draft, selectedDeviceId: event.target.value === "all" ? null : event.target.value })}
            >
              <option value="all">All devices</option>
              {devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.name}</option>)}
            </SelectInput>
          </label>
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <p className="text-[13px] text-muted-foreground">
          A crop preset fills a starting range from typical values — adjust it for your own soil, climate and cultivar. No universal limits are assumed.
        </p>
        {THRESHOLD_FIELDS.map((field) => (
          <div key={field.minKey} className="grid items-end gap-3 rounded-xl border border-border px-3 py-3 sm:grid-cols-[1fr_130px_130px]">
            <div className="text-[13.5px] font-semibold">
              {field.label}
              <span className="ml-1 font-mono text-[11px] font-normal text-muted-foreground">{field.unit}</span>
            </div>
            <label>
              <Label>Minimum</Label>
              <TextInput type="number" step={field.step} value={draft[field.minKey]} onChange={(event) => updateNumber(field.minKey, event.target.value)} />
            </label>
            <label>
              <Label>Maximum</Label>
              <TextInput type="number" step={field.step} value={draft[field.maxKey]} onChange={(event) => updateNumber(field.maxKey, event.target.value)} />
            </label>
          </div>
        ))}
      </section>

      <section className="panel space-y-3 p-5">
        <label className="block max-w-xs">
          <Label>Dashboard refresh</Label>
          <SelectInput value={draft.refreshSeconds} onChange={(event) => setDraft({ ...draft, refreshSeconds: Number(event.target.value) })}>
            {REFRESH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
        </label>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">The ESP32 uploads every 5 minutes by default; this only controls how often the screen re-checks.</p>
        <p className="rounded-xl bg-muted/50 px-3 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          A device is treated as offline when no reading arrives for 10 minutes. Missing sensor values are shown as missing, never as zero.
        </p>
      </section>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-[12.5px] font-medium text-rose-800">{error}</p> : null}
      {message ? <p className="text-[12.5px] font-medium text-primary">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
        Save settings
      </Button>
    </form>
  );
}
