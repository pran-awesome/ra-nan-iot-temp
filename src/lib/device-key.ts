import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function generateDeviceKey() {
  return `sopsmart_${randomBytes(24).toString("hex")}`;
}

export function hashDeviceKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function previewDeviceKey(key: string) {
  return key.slice(-4);
}
