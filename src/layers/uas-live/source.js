/** UAS telemetry snapshot from OS Atlas Vehicle Adapter API. */
export function createUasLiveSource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  return {
    async getSnapshot(_query, { signal } = {}) {
      signal?.throwIfAborted();
      const response = await fetchImpl('/api/uas/snapshot', {
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error('UAS snapshot HTTP ' + response.status);
      const envelope = await response.json();
      const data = envelope?.data ?? envelope;
      return data;
    },
    getStreamUrl(assetId) {
      return `/api/uas/stream/${encodeURIComponent(assetId)}`;
    },
    getMediaUrl(assetId) {
      return `/api/uas/media/${encodeURIComponent(assetId)}`;
    },
  };
}
