#!/usr/bin/env node
import assert from 'node:assert/strict';
import { OS_ATLAS_LAYER_IDS } from '../src/product/os-atlas-layer-registry.js';
import {
  createOsAtlasCatalog,
  resolveOsAtlasLayerMetadata,
} from '../src/app/constructCatalog.osAtlas.js';
import { createStandaloneLayerSources } from '../src/standalone/layerSources.js';
import { createSurfaceServices } from '../src/app/surfaceServices.js';

const REMOVED_OSINT = [
  'flights',
  'military',
  'cctv',
  'radio',
  'traffic',
  'transit',
  'bikeshare',
  'satellites',
  'rocket-launches',
  'military-awareness',
  'military-installations',
  'alpr-cameras',
  'recent-imagery',
  'telegeography-submarine-cables',
  'directions',
];

const controller = new AbortController();
const catalog = createOsAtlasCatalog({
  sources: createStandaloneLayerSources(),
  signal: controller.signal,
  surface: createSurfaceServices({
    terrainSource: { getHeights: async () => [] },
    signal: controller.signal,
    eventTarget: null,
  }),
  metadata: resolveOsAtlasLayerMetadata(),
});

const ids = new Set(catalog.layers.map((layer) => layer.id));
for (const removed of REMOVED_OSINT) {
  assert.equal(ids.has(removed), false, `OSINT layer must be absent: ${removed}`);
}
for (const allowed of OS_ATLAS_LAYER_IDS) {
  if (allowed === 'ais-live-vessels') continue;
  assert.equal(ids.has(allowed), true, `Expected OS Atlas layer: ${allowed}`);
}
assert.equal(catalog.militaryRegistry, null);
controller.abort();
console.log('test:os-atlas OK');
