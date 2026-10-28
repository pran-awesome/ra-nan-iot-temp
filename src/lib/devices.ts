const DEVICE_ID = /^[A-Za-z0-9_-]{3,64}$/;

export type DeviceInput = {
  deviceId: string;
  name: string;
  location: string | null;
  crop: string | null;
};

export type DeviceInputResult =
  | { ok: true; value: DeviceInput }
  | { ok: false; error: string };

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function validateDeviceInput(body: unknown): DeviceInputResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const record = body as Record<string, unknown>;
  const deviceId = clean(record.device_id, 64);
  const name = clean(record.name, 80);
  const location = clean(record.location, 120);
  const crop = clean(record.crop, 80);

  if (!DEVICE_ID.test(deviceId)) {
    return {
      ok: false,
      error: "Device ID needs 3–64 characters: letters, numbers, dashes or underscores.",
    };
  }
  if (!name) {
    return { ok: false, error: "Give the device a name." };
  }

  return {
    ok: true,
    value: {
      deviceId,
      name,
      location: location || null,
      crop: crop || null,
    },
  };
}
