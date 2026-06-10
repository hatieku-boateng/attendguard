import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { hashPassword, verifyPassword, getAuthSecret } from "@/lib/auth";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getEncryptionKey() {
  return createHash("sha256").update(getAuthSecret()).digest();
}

export function generatePasskey(length = 6) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomBytes(1)[0] % alphabet.length];
  }

  return value;
}

export function normalizePasskey(passkey: string) {
  return passkey.trim().toUpperCase().replaceAll(" ", "");
}

export async function hashPasskey(passkey: string) {
  return hashPassword(normalizePasskey(passkey));
}

export async function verifyPasskey(passkey: string, passkeyHash: string) {
  return verifyPassword(normalizePasskey(passkey), passkeyHash);
}

export function encryptPasskey(passkey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizePasskey(passkey), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptPasskey(ciphertext: string | null) {
  if (!ciphertext) {
    return null;
  }

  const [iv, tag, encrypted] = ciphertext
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));

  if (!iv || !tag || !encrypted) {
    return null;
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
