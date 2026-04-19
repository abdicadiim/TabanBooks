let requestSequence = 0;
const REQUEST_LOGGING_ENABLED = (import.meta as any).env?.VITE_API_DEBUG === "true";

const toRelativeEndpoint = (endpoint: string): string => {
  if (!endpoint) return endpoint;

  try {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const parsed = new URL(endpoint);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return endpoint;
  }

  return endpoint;
};

export const logFrontendRequest = (method: string, endpoint: string, source?: string): number => {
  const requestId = ++requestSequence;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const normalizedEndpoint = toRelativeEndpoint(endpoint);
  const trigger = source || "unknown";

  if (REQUEST_LOGGING_ENABLED) {
    console.info(`[frontend-request:${requestId}] ${normalizedMethod} ${normalizedEndpoint} <- ${trigger}`);
  }
  return requestId;
};

export const logFrontendRequestReuse = (
  method: string,
  endpoint: string,
  source?: string,
  reuseType: "cache" | "inflight" = "inflight",
): void => {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const normalizedEndpoint = toRelativeEndpoint(endpoint);
  const trigger = source || "unknown";

  if (REQUEST_LOGGING_ENABLED) {
    console.debug(`[frontend-request:${reuseType}] ${normalizedMethod} ${normalizedEndpoint} <- ${trigger}`);
  }
};
