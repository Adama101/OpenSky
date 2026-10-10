import { parseTapAddress } from '../../src/data/tapAddress.js';

/**
 * Validate upstream video URLs for edge-registered streams (RFC1918 / loopback only).
 * @param {string} rawUrl
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function validateEdgeVideoUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    return { ok: false, reason: 'scheme must be http or https' };
  if (url.username || url.password)
    return { ok: false, reason: 'credentials not allowed' };
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  const address = parseTapAddress(`${url.hostname}:${port}`);
  if (!address) {
    const extra = (process.env.UAS_EDGE_ALLOWED_HOSTS || '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (!extra.includes(url.hostname))
      return { ok: false, reason: 'host not allowed for edge video' };
  }
  return { ok: true, url };
}
