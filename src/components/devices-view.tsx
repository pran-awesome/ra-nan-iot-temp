"use client";

import Link from "next/link";
import { Cpu, KeyRound, Leaf, LoaderCircle, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CopyField } from "@/components/copy-field";
import { useFarm } from "@/components/farm-context";
import { StatusPill } from "@/components/status-pill";
import { Button, EmptyState, Label, PageHeader, TextInput, cn } from "@/components/ui";
import { formatAgo, formatStamp } from "@/lib/format";
import { devicePresence } from "@/lib/status";
import type { Device } from "@/lib/types";

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-foreground/30" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h2 className="text-[16px] font-bold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function DeviceCard({ device, onRotate, onRemove }: { device: Device; onRotate: () => void; onRemove: () => void }) {
  const presence = devicePresence(device.latest?.createdAt);
  const note = presence === "offline"
    ? "Offline — no upload for more than 10 minutes."
    : presence === "online"
      ? "Reporting normally."
      : "Waiting for the first upload.";
  return (
    <article className="panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14.5px] font-semibold">{device.name}</h3>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">{device.deviceId}</div>
        </div>
        <StatusPill status={presence} pulse={presence === "online"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-secondary-foreground">
        {device.location ? <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5"><MapPin className="h-3 w-3" />{device.location}</span> : null}
        {device.crop ? <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5"><Leaf className="h-3 w-3" />{device.crop}</span> : null}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <dt className="text-muted-foreground">Last upload</dt>
          <dd className="font-medium">{device.latest ? formatStamp(device.latest.createdAt) : "No readings yet"}</dd>
          <dd className="text-[11px] text-muted-foreground">{device.latest ? formatAgo(device.latest.createdAt) : ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Readings 24h</dt>
          <dd className="font-medium">{device.readings24h}</dd>
          <dd className="text-[11px] text-muted-foreground">every {Math.round(device.expectedIntervalSeconds / 60)} min</dd>
        </div>
      </dl>
      <p className="mt-3 font-mono text-[10.5px] text-muted-foreground">key ····{device.apiKeyPreview || "----"}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{note}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onRotate}><KeyRound className="h-3.5 w-3.5" /> Rotate key</Button>
        <Button variant="danger" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
      </div>
    </article>
  );
}

export function DevicesView() {
  const { devices, loading, error, refresh } = useFarm();
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<{ deviceId: string; uploadKey: string } | null>(null);
  const [rotateTarget, setRotateTarget] = useState<Device | null>(null);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Device | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ device_id: "farm_001", name: "North field unit", location: "", crop: "" });

  const online = devices.filter((device) => devicePresence(device.latest?.createdAt) === "online").length;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function registerDevice(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    const response = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) {
      setFormError(body.error || "Could not register this device.");
      return;
    }
    setIssued({ deviceId: body.device_id, uploadKey: body.upload_key });
    await refresh();
  }

  async function rotate() {
    if (!rotateTarget) return;
    setPending(true);
    setFormError(null);
    const response = await fetch(`/api/devices/${encodeURIComponent(rotateTarget.deviceId)}/rotate`, { method: "POST" });
    const body = await response.json();
    setPending(false);
    if (!response.ok) {
      setFormError(body.error || "Could not rotate the key. Try again.");
      return;
    }
    setRotatedKey(body.upload_key);
    await refresh();
  }

  async function remove() {
    if (!removeTarget) return;
    setPending(true);
    const response = await fetch(`/api/devices/${encodeURIComponent(removeTarget.deviceId)}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) {
      const body = await response.json();
      setFormError(body.error || "Could not remove the device.");
      return;
    }
    setRemoveTarget(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Farm"
        title="Register an ESP32"
        description="Each unit gets its own upload key, so readings can always be traced to one device."
        actions={
          <Button onClick={() => { setAdding(true); setIssued(null); setFormError(null); }}>
            <Plus className="h-3.5 w-3.5" /> Add device
          </Button>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-4 text-[13px] text-rose-900">Couldn’t load your devices. Refresh the page to try again.</div> : null}

      {!loading && devices.length > 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {devices.length} registered unit{devices.length === 1 ? "" : "s"} · {online} online · offline after 10 minutes without an upload
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" />
      ) : devices.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-5 w-5" />}
          title="No devices registered"
          description="Register your ESP32 to generate an upload key, then follow the setup guide to flash the firmware."
          actionLabel="Open the setup guide"
          actionTo="/setup"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((device) => (
            <DeviceCard
              key={device.deviceId}
              device={device}
              onRotate={() => { setRotateTarget(device); setRotatedKey(null); setFormError(null); }}
              onRemove={() => { setRemoveTarget(device); setFormError(null); }}
            />
          ))}
        </div>
      )}

      {adding ? (
        <Modal title={issued ? "Device registered" : "Add device"} onClose={() => setAdding(false)}>
          {issued ? (
            <div className="space-y-3 text-[13px] text-muted-foreground">
              <p>Copy the upload key into your firmware now — it is shown only once. If you lose it, rotate the key from the device card.</p>
              <CopyField label="Device ID" value={issued.deviceId} />
              <CopyField label="Upload key" value={issued.uploadKey} />
              <CopyField label="Upload endpoint" value={`${origin}/api/ingest`} />
              <p>Send readings every 300 seconds with the key in an <span className="font-mono">x-api-key</span> header. The Setup guide has a ready-to-flash sketch.</p>
              <Button onClick={() => setAdding(false)}>Done</Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={registerDevice}>
              <label className="block"><Label>Device ID</Label><TextInput value={form.device_id} onChange={(event) => setForm({ ...form, device_id: event.target.value })} className="font-mono" required /></label>
              <label className="block"><Label>Name</Label><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="North field unit" required /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><Label hint="optional">Location</Label><TextInput value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Greenhouse 2" /></label>
                <label className="block"><Label hint="optional">Crop</Label><TextInput value={form.crop} onChange={(event) => setForm({ ...form, crop: event.target.value })} placeholder="Tomato" /></label>
              </div>
              <p className="text-[12px] text-muted-foreground">The upload interval is set on the device; 300 seconds (5 minutes) is the default.</p>
              {formError ? <p className="text-[12.5px] font-medium text-rose-700">{formError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null} Register device</Button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}

      {rotateTarget ? (
        <Modal title={rotatedKey ? "New upload key" : `Rotate the key for ${rotateTarget.name}?`} onClose={() => setRotateTarget(null)}>
          {rotatedKey ? (
            <div className="space-y-3 text-[13px] text-muted-foreground">
              <p>Update the firmware with this key — the previous key stops working immediately.</p>
              <CopyField label="Upload key" value={rotatedKey} />
              <Button onClick={() => setRotateTarget(null)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3 text-[13px] text-muted-foreground">
              <p>The current key stops working immediately. The device will not be able to upload until you update its firmware.</p>
              {formError ? <p className="font-medium text-rose-700">{formError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setRotateTarget(null)}>Cancel</Button>
                <Button onClick={() => void rotate()} disabled={pending}>{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null} Rotate key</Button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}

      {removeTarget ? (
        <Modal title={`Remove ${removeTarget.name}`} onClose={() => setRemoveTarget(null)}>
          <div className="space-y-3 text-[13px] text-muted-foreground">
            <p>The device, its upload key, and its stored readings are deleted.</p>
            {formError ? <p className="font-medium text-rose-700">{formError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void remove()} disabled={pending}>{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null} Remove device</Button>
            </div>
          </div>
        </Modal>
      ) : null}

      <p className={cn("text-[12px] text-muted-foreground")}>
        Need the sketch? <Link href="/setup" className="font-semibold text-primary underline underline-offset-2">Open the setup guide</Link>.
      </p>
    </div>
  );
}
