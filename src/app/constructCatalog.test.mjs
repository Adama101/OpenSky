import { createSurfaceServices } from './surfaceServices.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationCatalog } from './constructCatalog.js';
import { createStandaloneLayerSources } from '../standalone/layerSources.js';
import { catalogControlServices } from './catalog.js';
import { OS_ATLAS_LAYER_IDS } from '../product/os-atlas-layer-registry.js';

test('OS Atlas catalog exposes only the slim layer set', async (t) => {
  const controller = new AbortController();
  t.after(() => controller.abort());
  const catalog = createApplicationCatalog({
    sources: createStandaloneLayerSources(),
    signal: controller.signal,
    surface: fixtureSurface(controller.signal),
  });
  const ids = catalog.layers.map(({ id }) => id);
  for (const removed of [
    'flights',
    'cctv',
    'radio',
    'traffic',
    'satellites',
    'transit',
  ]) {
    assert.equal(ids.includes(removed), false, `${removed} must be stripped`);
  }
  assert.ok(catalog.get('morocco-site-pack'));
  assert.ok(catalog.get('tenant-cctv'));
  assert.ok(catalog.get('local-adsb'));
  assert.equal(catalog.militaryRegistry, null);
  assert.deepEqual(
    catalog.metadata.find(({ id }) => id === 'local-adsb'),
    { id: 'local-adsb', disposition: 'local-only' },
  );
  const services = catalogControlServices(catalog);
  assert.equal(services.localAdsbLayer, catalog.get('local-adsb'));
  assert.equal(services.flightsLayer.id, 'flights');
  assert.equal(typeof services.flightsLayer.stopTracking, 'function');
  for (const id of OS_ATLAS_LAYER_IDS) {
    if (id === 'ais-live-vessels') continue;
    assert.ok(catalog.get(id), `missing ${id}`);
  }
});

test('invalid OS Atlas construction fails before layers attach', () => {
  const lifetime = new AbortController();
  assert.throws(
    () =>
      createApplicationCatalog({
        sources: {},
        signal: lifetime.signal,
        surface: fixtureSurface(lifetime.signal),
      }),
    /catalog source/,
  );
  lifetime.abort();
  assert.throws(
    () =>
      createApplicationCatalog({
        sources: createStandaloneLayerSources(),
        signal: lifetime.signal,
        surface: fixtureSurface(lifetime.signal),
      }),
    { name: 'AbortError' },
  );
});

function fixtureSurface(signal) {
  return createSurfaceServices({
    terrainSource: { getHeights: async () => [] },
    signal,
    eventTarget: null,
  });
}
