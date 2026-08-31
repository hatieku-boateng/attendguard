import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

function normalizedAccessKey() {
  return process.env.ADMIN_LOGIN_PATH?.trim().replace(/^\/+|\/+$/g, "") ?? "";
}

export function isAdminAccessKey(value: string) {
  const configuredKey = normalizedAccessKey();

  if (configuredKey.length < 24) {
    return false;
  }

  const configuredDigest = createHash("sha256").update(configuredKey).digest();
  const suppliedDigest = createHash("sha256").update(value).digest();
  return timingSafeEqual(configuredDigest, suppliedDigest);
}

export function getAdminLoginPath() {
  const configuredKey = normalizedAccessKey();
  return configuredKey.length >= 24 ? `/${configuredKey}` : null;
}
