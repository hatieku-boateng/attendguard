import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthSecret } from "@/lib/server-secret";

export const QR_ROTATION_SECONDS = 5;
export const QR_ACCEPTED_WINDOWS = 2;

type QrPayload = {
  version: 1;
  sessionId: string;
  window: number;
};

type QrVerification =
  | { valid: true; sessionId: string; window: number }
  | {
      valid: false;
      reason: "invalid_qr" | "expired_qr";
      sessionId?: string;
    };

function currentWindow(now: number) {
  return Math.floor(now / (QR_ROTATION_SECONDS * 1000));
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`attendance-qr:${payload}`)
    .digest("base64url");
}

function signaturesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function createAttendanceQrToken(sessionId: string, now = Date.now()) {
  const window = currentWindow(now);
  const payload = Buffer.from(
    JSON.stringify({ version: 1, sessionId, window } satisfies QrPayload),
  ).toString("base64url");
  const refreshAt = (window + 1) * QR_ROTATION_SECONDS * 1000;

  return {
    token: `${payload}.${sign(payload)}`,
    refreshAt,
    acceptedUntil:
      refreshAt + (QR_ACCEPTED_WINDOWS - 1) * QR_ROTATION_SECONDS * 1000,
  };
}

export function verifyAttendanceQrToken(
  token: string,
  now = Date.now(),
): QrVerification {
  const [encodedPayload, signature, extra] = token.trim().split(".");

  if (
    !encodedPayload ||
    !signature ||
    extra ||
    !signaturesMatch(sign(encodedPayload), signature)
  ) {
    return { valid: false, reason: "invalid_qr" };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<QrPayload>;
    const window = payload.window;

    if (
      payload.version !== 1 ||
      typeof payload.sessionId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(payload.sessionId) ||
      typeof window !== "number" ||
      !Number.isSafeInteger(window)
    ) {
      return { valid: false, reason: "invalid_qr" };
    }

    const age = currentWindow(now) - window;

    if (age < 0) {
      return { valid: false, reason: "invalid_qr" };
    }

    if (age >= QR_ACCEPTED_WINDOWS) {
      return {
        valid: false,
        reason: "expired_qr",
        sessionId: payload.sessionId,
      };
    }

    return {
      valid: true,
      sessionId: payload.sessionId,
      window,
    };
  } catch {
    return { valid: false, reason: "invalid_qr" };
  }
}
