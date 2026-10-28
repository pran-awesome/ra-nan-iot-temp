"use client";

import Link from "next/link";
import { Cpu, Database, KeyRound, Radio, ShieldCheck, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { CodeBlock, CopyField } from "@/components/copy-field";
import { PageHeader } from "@/components/ui";

const SAMPLE = `{
  "device_id": "farm_001",
  "soil_moisture_raw": 2200,
  "soil_moisture_percent": 62.5,
  "water_raw": 1800,
  "light_raw": 2450,
  "air_temperature": 31.2,
  "air_humidity": 75.0
}`;

function Step({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="panel space-y-3 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SetupView({ sketch, schema }: { sketch: string; schema: string }) {
  const [origin, setOrigin] = useState("https://YOUR-VERCEL-DOMAIN");
  useEffect(() => setOrigin(window.location.origin), []);
  const ingest = `${origin}/api/ingest`;
  const liveSketch = sketch.replaceAll("https://YOUR-VERCEL-DOMAIN/api/ingest", ingest);
  const curl = `curl -X POST "${ingest}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_DEVICE_KEY" \\
  -d '${SAMPLE.replace(/\n\s*/g, "")}'`;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Documentation"
        title="Setup guide"
        description="Connect an ESP32 to this app: register the device, flash the sketch, and readings appear within one interval."
      />

      <Step icon={KeyRound} title="1 · Register the device" description="Each unit gets its own upload key. The key is shown once and stored only as a hash, so the sensor table can never be written from a browser.">
        <p className="text-[13px] text-muted-foreground">
          Open <Link href="/devices" className="font-semibold text-primary underline underline-offset-2">Devices</Link> and choose “Add device”. You will get a device ID (for example <span className="font-mono text-[11.5px]">farm_001</span>) and an upload key.
        </p>
        <CopyField label="Upload endpoint" value={ingest} />
      </Step>

      <Step icon={Radio} title="2 · Payload" description="The firmware posts one JSON object per reading. Values the sensor cannot read are left out entirely — the server records them as missing, never as zero. A JSON null is treated the same way.">
        <CodeBlock caption="JSON body" code={SAMPLE} />
        <CodeBlock caption="Test from a terminal" code={curl} />
        <CopyField label="Response fields" value="ok · reading_id · received_at · stored · missing_fields" mono={false} />
      </Step>

      <Step icon={Cpu} title="3 · ESP32 firmware" description="Reads the DHT11, calibrated soil moisture probe, HW-038 water sensor and LDR every 10 seconds, then uploads the latest values every 300 seconds over Wi-Fi. The first upload is sent as soon as Wi-Fi connects.">
        <CodeBlock caption="Arduino · ESP32 sketch" code={liveSketch} />
      </Step>

      <Step icon={Database} title="4 · Database schema" description="Readings, devices and per-user preferences live in Supabase. Row level security lets a signed-in user read only their own farm. The ingest route uses the service role to verify the upload key and insert the row.">
        <CodeBlock caption="supabase/schema.sql" code={schema} />
      </Step>

      <Step icon={Terminal} title="5 · Run and deploy" description="This app is a Next.js project for Vercel. Supabase holds the database and the user accounts.">
        <CodeBlock
          caption="Local development"
          code={`npm install
npm run dev      # http://localhost:3000
npm run build    # production build`}
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Set <span className="font-mono text-[11.5px]">NEXT_PUBLIC_SUPABASE_URL</span>, <span className="font-mono text-[11.5px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> and <span className="font-mono text-[11.5px]">SUPABASE_SERVICE_ROLE_KEY</span> in Vercel. After the URL changes, update <span className="font-mono text-[11.5px]">INGEST_URL</span> in the sketch and re-flash.
        </p>
      </Step>

      <Step icon={ShieldCheck} title="6 · Access and safety" description="Everything here is monitoring only — the app never controls irrigation or other equipment.">
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
          <li>Dashboard, history, devices and settings require a signed-in user.</li>
          <li>Sensor readings can only be written by the upload endpoint, which verifies the device key on the server. The service-role key never goes to the browser or the firmware.</li>
          <li>Rotate a device key from the Devices page if a unit is lost or replaced.</li>
          <li>Thresholds are per user and per crop; alerts reflect your settings, not a universal standard.</li>
        </ul>
      </Step>
    </div>
  );
}
