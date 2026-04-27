const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isRetryableImportError = (error: unknown) => {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("networkerror") ||
    message.includes("err_network_changed") ||
    message.includes("load failed")
  );
};

export async function lazyRetry<T>(
  importer: () => Promise<T>,
  retries = 2,
  delayMs = 400
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await importer();
    } catch (error) {
      lastError = error;

      if (attempt === retries || !isRetryableImportError(error)) {
        throw error;
      }

      await wait(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}
