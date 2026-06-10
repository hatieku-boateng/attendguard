import { createHash, randomBytes } from "node:crypto";

export const activationTokenMaxAgeHours = 72;

export function createActivationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getActivationExpiry() {
  return new Date(Date.now() + activationTokenMaxAgeHours * 60 * 60 * 1000);
}

export function getActivationUrl(token: string) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = new URL("/activate-account", appUrl);
  url.searchParams.set("token", token);

  return url.toString();
}
