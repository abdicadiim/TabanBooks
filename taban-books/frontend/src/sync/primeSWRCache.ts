import { apiRequest } from "../services/api";
import { createAdaptiveStorageAdapter } from "./persistence";
import { attachVersionStamp } from "./versioning";

type PrimeSpec = {
  resource: string;
  endpoint: string;
  storageKey: string;
  mapItems: (response: any) => any[];
  mapMeta?: (response: any) => Record<string, any>;
};

const safeArray = (value: any) => (Array.isArray(value) ? value : []);

export async function primeSWRCache(signal?: AbortSignal) {
  // Only prime when authenticated (remote mode)
  if (typeof window === "undefined") return;
  if (localStorage.getItem("taban_auth_mode") === "local") return;
  if (!localStorage.getItem("auth_token")) return;

  const specs: PrimeSpec[] = [
    {
      resource: "customers",
      endpoint: "/customers?page=1&limit=50&search=",
      storageKey: "taban:swr:customers:/customers?page=1&limit=50&search=",
      mapItems: (r) => safeArray(r?.data),
      mapMeta: (r) => ({ pagination: r?.pagination }),
    },
    {
      resource: "taxes",
      endpoint: "/settings/taxes",
      storageKey: "taban:swr:taxes:/settings/taxes",
      mapItems: (r) => safeArray(r?.data),
    },
    {
      resource: "currencies",
      endpoint: "/settings/currencies?limit=2000",
      storageKey: "taban:swr:currencies:/settings/currencies?limit=2000",
      mapItems: (r) => safeArray(r?.data),
    },
    {
      resource: "reporting-tags",
      endpoint: "/settings/reporting-tags?limit=10000",
      storageKey: "taban:swr:reporting-tags:/settings/reporting-tags?limit=10000",
      mapItems: (r) => safeArray(r?.data),
    },
    {
      resource: "accounts",
      endpoint: "/accounts?limit=1000",
      storageKey: "taban:swr:accounts:/accounts?limit=1000",
      mapItems: (r) => safeArray(r?.data),
      mapMeta: (r) => ({ pagination: r?.pagination }),
    },
  ];

  await Promise.allSettled(
    specs.map(async (spec) => {
      const response = await apiRequest(spec.endpoint, {
        meta: {
          source: `prime:${spec.resource}`,
          dedupeKey: `prime:${spec.resource}:${spec.endpoint}`,
          skipCache: true,
          allowNotModified: true,
        },
        signal,
      });

      // apiRequest returns {notModified:true} for 304 when allowNotModified is enabled.
      if (response?.notModified === true) return;

      const adapter = createAdaptiveStorageAdapter<any>({ key: spec.storageKey });
      await adapter.write(
        attachVersionStamp({
          resource: spec.resource,
          items: spec.mapItems(response),
          ...(spec.mapMeta ? spec.mapMeta(response) : {}),
          version_id: response?.version_id,
          last_updated: response?.last_updated,
        }),
      );
    }),
  );
}

