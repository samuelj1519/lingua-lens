let fetchingForeignHovers = false;

export async function withForeignHoverFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  if (fetchingForeignHovers) return null;
  fetchingForeignHovers = true;
  try {
    return await fn();
  } finally {
    fetchingForeignHovers = false;
  }
}
