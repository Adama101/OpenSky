/** Server-side product profile (mirrors VITE_PRODUCT in the browser bundle). */
export function getServerProduct() {
  const raw =
    process.env.VITE_PRODUCT ?? process.env.PRODUCT ?? 'os-atlas';
  return String(raw).trim().toLowerCase() === 'gev' ? 'gev' : 'os-atlas';
}

export function isGevProduct() {
  return getServerProduct() === 'gev';
}

export function isOsAtlasProduct() {
  return getServerProduct() === 'os-atlas';
}

function envFlag(name) {
  const value = String(process.env[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/** AIS ingest is tenant opt-in for OS Atlas; always on for legacy GEV. */
export function isTenantAisEnabledOnServer() {
  if (isGevProduct()) return true;
  return envFlag('VITE_TENANT_AIS_ENABLED');
}
