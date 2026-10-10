import { isOsAtlas } from './os-atlas.js';

function envFlag(name) {
  const value = String(import.meta.env?.[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/** Tenant AIS is opt-in on OS Atlas; requires server AISSTREAM_API_KEY. */
export function isTenantAisEnabled() {
  if (!isOsAtlas()) return true;
  return envFlag('VITE_TENANT_AIS_ENABLED');
}

export function tenantAisConfiguredHint() {
  return 'Set AISSTREAM_API_KEY on the server and VITE_TENANT_AIS_ENABLED=true to enable vessels.';
}
