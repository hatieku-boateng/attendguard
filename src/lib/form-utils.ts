export function cleanString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function fileToDataUrl(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/") || file.size > 750_000) {
    return "invalid";
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
