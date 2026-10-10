import { isOsAtlas } from './os-atlas.js';

const STORAGE_KEY = 'os-atlas:session-token';

function readStoredToken() {
  try {
    return String(globalThis.sessionStorage?.getItem(STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function storeToken(token) {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

/** Attach session header for authenticated OS Atlas API calls. */
export function installOsAtlasFetchSession() {
  if (!isOsAtlas()) return () => {};
  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch) return () => {};

  globalThis.fetch = async (input, init = {}) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes('/api/') || url.includes('/api/health')) {
      return nativeFetch(input, init);
    }
    const token = readStoredToken();
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('x-os-atlas-session')) {
      headers.set('x-os-atlas-session', token);
    }
    return nativeFetch(input, { ...init, headers });
  };

  return () => {
    globalThis.fetch = nativeFetch;
  };
}

/** Prompt once when the dev server requires OS_ATLAS_SESSION_TOKEN. */
export async function bootstrapOsAtlasSession({
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!isOsAtlas()) return;
  try {
    const health = await fetchImpl('/api/health', { cache: 'no-store' });
    if (!health.ok) return;
  } catch {
    return;
  }
  if (readStoredToken()) return;
  try {
    const probe = await fetchImpl('/api/weather/radar', { cache: 'no-store' });
    if (probe.status !== 401 && probe.status !== 503) return;
  } catch {
    return;
  }
  const token = globalThis.prompt?.(
    'OS Atlas API session token (OS_ATLAS_SESSION_TOKEN):',
  );
  if (token?.trim()) storeToken(token.trim());
}
