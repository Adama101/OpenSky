/** @returns {'os-atlas' | 'gev'} */
export function getProduct() {
  const raw = import.meta.env?.VITE_PRODUCT ?? 'os-atlas';
  const normalized = String(raw).trim().toLowerCase();
  return normalized === 'gev' ? 'gev' : 'os-atlas';
}

export function isOsAtlas() {
  return getProduct() === 'os-atlas';
}

export function isGevLegacy() {
  return getProduct() === 'gev';
}

export function catalogProfile() {
  return getProduct();
}
