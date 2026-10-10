/** Tenant-configured cameras via server registry (no public catalog). */
export function createTenantCctvSource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  async function read(path, key, { signal } = {}) {
    signal?.throwIfAborted();
    const response = await fetchImpl(path, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Tenant CCTV HTTP ' + response.status);
    const payload = await response.json();
    signal?.throwIfAborted();
    if (!Array.isArray(payload?.[key]))
      throw new Error('Malformed tenant CCTV ' + key);
    return payload;
  }
  return {
    getCatalog(options) {
      return read('/api/tenant-cctv/sources', 'sources', options);
    },
    getHealth(options) {
      return read('/api/tenant-cctv/health', 'cameras', options);
    },
    getFrameUrl(camera) {
      return `/api/tenant-cctv/frame/${encodeURIComponent(camera.id)}`;
    },
    getMediaUrl(camera) {
      return `/api/tenant-cctv/media/${encodeURIComponent(camera.id)}`;
    },
  };
}
