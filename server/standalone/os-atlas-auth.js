const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/auth/',
  '/api/setup/',
];

function isPublicApi(pathname) {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function isUasIngestPost(method, pathname) {
  if (method !== 'POST') return false;
  if (pathname === '/api/uas/assets' || pathname === '/api/uas/telemetry')
    return true;
  if (pathname === '/api/uas/detections') return true;
  return /^\/api\/uas\/missions\/[^/]+\/upload$/.test(pathname);
}

function uasIngestAuthorized(req) {
  const expected = process.env.OS_ATLAS_UAS_INGEST_TOKEN || '';
  if (!expected) return false;
  const header = String(req.headers['x-os-atlas-uas-ingest'] || '');
  return header === expected;
}

import { isOsAtlasProduct } from '../product/os-atlas.js';

/** Require OS_ATLAS_SESSION_TOKEN for API routes when OS Atlas product mode is active. */
export function osAtlasAuthPlugin({ enabled = isOsAtlasProduct() } = {}) {
  const expected = process.env.OS_ATLAS_SESSION_TOKEN || '';
  const install = (middlewares) => {
    if (!enabled) return;
    middlewares.use((req, res, next) => {
      const url = req.url || '';
      if (!url.startsWith('/api/')) return next();
      const pathname = url.split('?')[0];
      if (isPublicApi(pathname)) return next();
      if (isUasIngestPost(req.method, pathname) && uasIngestAuthorized(req))
        return next();
      if (!expected) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: 'auth_not_configured',
            message: 'Set OS_ATLAS_SESSION_TOKEN for API access',
          }),
        );
        return;
      }
      const header = String(req.headers['x-os-atlas-session'] || '');
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const token = header || bearer;
      if (token !== expected) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
      next();
    });
  };
  return {
    name: 'os-atlas-auth',
    configureServer: install,
    configurePreviewServer: install,
  };
}

export function osAtlasHealthPlugin() {
  const install = (middlewares) => {
    middlewares.use('/api/health', (_req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, product: 'os-atlas' }));
    });
  };
  return {
    name: 'os-atlas-health',
    configureServer: install,
    configurePreviewServer: install,
  };
}
