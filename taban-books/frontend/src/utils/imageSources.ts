export function normalizeImageSrc(value: string | ArrayBuffer | null | undefined, fallback = ""): string {
  if (typeof value === "string") {
    const raw = value.trim();
    return raw || fallback;
  }

  if (value instanceof ArrayBuffer) {
    return fallback;
  }

  return fallback;
}
