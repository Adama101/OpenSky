import { isGevLegacy } from '../product/os-atlas.js';
import { createGevCatalog, GEV_APPLICATION_LAYER_METADATA } from './constructCatalog.gev.js';
import {
  createOsAtlasCatalog,
  OS_ATLAS_LAYER_METADATA,
} from './constructCatalog.osAtlas.js';

export { LOCAL_ONLY_LAYER_METADATA } from './constructCatalog.gev.js';
export { createOsAtlasCatalog, OS_ATLAS_LAYER_METADATA } from './constructCatalog.osAtlas.js';
export { createGevCatalog, GEV_APPLICATION_LAYER_METADATA } from './constructCatalog.gev.js';

/** @deprecated Use profile-specific metadata; defaults to OS Atlas. */
export const APPLICATION_LAYER_METADATA = isGevLegacy()
  ? GEV_APPLICATION_LAYER_METADATA
  : OS_ATLAS_LAYER_METADATA;

/** Construct the application layer catalog for the active product profile. */
export function createApplicationCatalog(options) {
  if (isGevLegacy()) return createGevCatalog(options);
  return createOsAtlasCatalog(options);
}
