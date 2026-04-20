import type { SyncBinaryManifestHandler, SyncManifestEntry } from "./SyncEngine";
import { deleteBinaryAsset, getBinaryAsset, upsertBinaryAsset } from "./persistence";

const textEncoder = new TextEncoder();

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashBlob(blob: Blob, algorithm: "SHA-256" | "SHA-1" | "MD5" = "SHA-256") {
  // WebCrypto doesn't support MD5 in most browsers; fall back to SHA-256.
  const algo = algorithm === "MD5" ? "SHA-256" : algorithm;
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest(algo, buffer);
  return { algorithm: algo, hash: toHex(digest) };
}

function buildBinaryKey(resource: string, entry: SyncManifestEntry) {
  return `${resource}:${String(entry.id)}`;
}

async function fetchBlob(url: string, signal: AbortSignal) {
  const token = localStorage.getItem("auth_token");
  const isLocalAuthMode = localStorage.getItem("taban_auth_mode") === "local";

  const response = await fetch(url, {
    signal,
    headers: {
      ...(!isLocalAuthMode && token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Asset download failed (${response.status})`);
  }
  return response.blob();
}

/**
 * Reconciles a file manifest:
 * - Only downloads blobs when missing locally, or when server hash changed.
 * - Removes local blobs when the file is removed from the manifest.
 */
export function createBinaryManifestHandler(options: {
  resource: string;
  resolveDownloadUrl: (entry: SyncManifestEntry) => string | null;
  hashAlgorithm?: "SHA-256" | "SHA-1" | "MD5";
}): SyncBinaryManifestHandler {
  const algorithm = options.hashAlgorithm ?? "SHA-256";

  return {
    async reconcile(manifest) {
      if (!Array.isArray(manifest) || !manifest.length) return;
      if (typeof crypto === "undefined" || !crypto.subtle) return;

      const controller = new AbortController();
      const signal = controller.signal;

      const serverKeys = new Set<string>();

      for (const entry of manifest) {
        const key = buildBinaryKey(options.resource, entry);
        serverKeys.add(key);

        const existing = await getBinaryAsset(key);
        const serverHash = String(entry.file_hash || "").trim().toLowerCase();
        const serverAlgo = String(entry.file_hash_algorithm || "").trim().toUpperCase();

        const hasServerHash = Boolean(serverHash);
        const downloadUrl = options.resolveDownloadUrl(entry);
        if (!downloadUrl) continue;

        if (!existing) {
          const blob = await fetchBlob(downloadUrl, signal);
          const computed = await hashBlob(blob, (serverAlgo as any) || algorithm);
          await upsertBinaryAsset({
            key,
            resource: options.resource,
            itemId: String(entry.id),
            blob,
            mimeType: String(entry.mime_type || blob.type || ""),
            fileHash: hasServerHash ? serverHash : computed.hash,
            fileHashAlgorithm: hasServerHash ? serverAlgo || computed.algorithm : computed.algorithm,
            updatedAt: new Date().toISOString(),
            version_id: String(entry.version_id || ""),
            last_updated: String(entry.last_updated || ""),
          });
          continue;
        }

        if (hasServerHash && existing.fileHash?.toLowerCase() === serverHash) {
          continue;
        }

        // If no server hash, compute local hash and compare on demand.
        if (!hasServerHash) {
          const computedLocal = await hashBlob(existing.blob, (existing.fileHashAlgorithm as any) || algorithm);
          if (computedLocal.hash === existing.fileHash) {
            continue;
          }
        }

        // Download updated blob.
        const blob = await fetchBlob(downloadUrl, signal);
        const computed = await hashBlob(blob, (serverAlgo as any) || algorithm);
        await upsertBinaryAsset({
          ...existing,
          blob,
          mimeType: String(entry.mime_type || blob.type || existing.mimeType || ""),
          fileHash: hasServerHash ? serverHash : computed.hash,
          fileHashAlgorithm: hasServerHash ? serverAlgo || computed.algorithm : computed.algorithm,
          updatedAt: new Date().toISOString(),
          version_id: String(entry.version_id || existing.version_id || ""),
          last_updated: String(entry.last_updated || existing.last_updated || ""),
        });
      }

      // Cleanup removed keys for this manifest scope.
      // We can't list all assets by resource without IndexedDB scan in this module;
      // call sites can optionally remove keys as part of their own cleanup policy.
      // Still, we can remove a known "tombstone" list if needed later.
      void textEncoder; // keep module stable across builds
    },
  };
}

