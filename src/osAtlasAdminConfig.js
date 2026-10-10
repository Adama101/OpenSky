/** OS Atlas uses env/admin configuration instead of the consumer POWER UP flow. */
export async function initOsAtlasAdminConfig({ signal } = {}) {
  if (signal?.aborted) return null;
  return { destroy() {} };
}
