import { apiRequest } from "../services/api";
import { writeCachedListResponse } from "../services/swrListCache";

type PrimeSpec = {
  endpoint: string;
};

export async function primeSWRCache(signal?: AbortSignal) {
  // Only prime when authenticated (remote mode)
  if (typeof window === "undefined") return;
  if (localStorage.getItem("taban_auth_mode") === "local") return;
  if (!localStorage.getItem("auth_token")) return;

  const specs: PrimeSpec[] = [
    {
      endpoint: "/customers",
    },
    {
      endpoint: "/customers?limit=1000",
    },
    {
      endpoint: "/settings/taxes",
    },
    {
      endpoint: "/settings/currencies?limit=2000",
    },
    {
      endpoint: "/projects",
    },
    {
      endpoint: "/settings/reporting-tags?limit=10000",
    },
    {
      endpoint: "/accounts?limit=1000",
    },
    {
      endpoint: "/time-entries",
    },
    {
      endpoint: "/settings/units",
    },
  ];

  await Promise.allSettled(
    specs.map(async (spec) => {
      const response = await apiRequest(spec.endpoint, {
        meta: {
          source: `prime:${spec.endpoint}`,
          dedupeKey: `prime:${spec.endpoint}`,
          skipCache: true,
          allowNotModified: true,
        },
        signal,
      });

      // apiRequest returns {notModified:true} for 304 when allowNotModified is enabled.
      if (response?.notModified === true) return;

      await writeCachedListResponse(spec.endpoint, response, {
        version_id: response?.version_id,
        last_updated: response?.last_updated,
      });
    }),
  );
}

