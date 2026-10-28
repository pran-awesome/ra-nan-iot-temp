# Smart Sop Puen Smart Farm

Remote monitoring for ESP32 nodes: soil moisture, HW-038 water, LDR light, and DHT11 air temperature and humidity. The dashboard runs on Vercel. Accounts, devices, and readings live in Supabase.

This replaces the Base44 app. The ESP32 still posts JSON to `/api/ingest` with an `x-api-key` header. Irrigation equipment is never switched from this app.

## What you set up once

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase → Authentication → URL configuration, set the site URL to your Vercel domain and add `https://YOUR-DOMAIN/auth/callback` as a redirect URL. Turn on Email. Google is optional under Authentication → Providers.
4. In Vercel, import this repo and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never put this in the sketch)

5. Deploy. Sign up, open **Devices**, and register a unit such as `farm_001`. Copy the upload key when it is shown. It is stored only as a hash.
6. Flash [`firmware/smart_sop_puen/smart_sop_puen.ino`](firmware/smart_sop_puen/smart_sop_puen.ino). Set the Wi-Fi name, Wi-Fi password, device id, upload key, and:

   `https://YOUR-DOMAIN/api/ingest`

The sketch reads sensors every 10 seconds and uploads the latest sample every 5 minutes. The first upload goes out as soon as Wi-Fi connects. The serial monitor prints the HTTP status so you can confirm the new endpoint.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

`npm test` checks payload parsing and alert rules. `npm run build` produces the Vercel build.

## Ingest

`POST /api/ingest` with header `x-api-key: sopsmart_...`

```json
{
  "device_id": "farm_001",
  "soil_moisture_raw": 2200,
  "soil_moisture_percent": 62.5,
  "water_raw": 1800,
  "light_raw": 2450,
  "air_temperature": 31.2,
  "air_humidity": 75.0
}
```

Leave a field out, or send `null`, when that sensor did not report. The row stores it as missing rather than zero. A successful response is `{ ok, reading_id, received_at, stored, missing_fields }`.

The old Base44 upload key does not work here. Register the device again and paste the new key into the sketch.
