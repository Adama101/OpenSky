/** Commercial satellite tasking adapter (stub contract for Phase 0). */
export function createSatelliteTaskingSource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async getSnapshot(_query, { signal } = {}) {
      signal?.throwIfAborted();
      const response = await fetchImpl('/api/satellite/status', {
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error('Satellite status HTTP ' + response.status);
      return response.json();
    },
  };
}
