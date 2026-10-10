import { createWeatherClock } from '../layers/weather/clock.js';
import { createWeatherLayer } from '../layers/weather/index.js';
import { createCyclonesLayer } from '../layers/cyclones/index.js';
import { createWindLayer } from '../layers/wind/index.js';
import { createLayerCatalog } from './catalog.js';
import { createApplicationVessels } from './layers/aisLiveVessels.js';
import { createApplicationLocalAdsb } from './layers/localAdsb.js';
import { createApplicationFirms } from './layers/firms.js';
import { createApplicationEarthquakes } from './layers/earthquakes.js';
import { createApplicationFirePerimeters } from './layers/perimeters.js';
import { localGeoJsonServices } from './localGeojsonServices.js';
import { createMoroccoSitePackLayers } from '../data/moroccoSitePack.js';
import { createPlatformStubLayer } from '../layers/platformStub/index.js';
import { createUasLiveLayer } from '../layers/uas-live/index.js';
import { isTenantAisEnabled } from '../product/tenant-config.js';
import { OS_ATLAS_LAYER_METADATA } from '../product/os-atlas-layer-registry.js';

export { OS_ATLAS_LAYER_METADATA } from '../product/os-atlas-layer-registry.js';

export const OS_ATLAS_SOURCE_METHODS = Object.freeze({
  vessels: ['getSnapshot'],
  firms: ['getSnapshot'],
  wind: ['getSnapshot'],
  weather: ['getSnapshot'],
  cyclones: ['getSnapshot'],
  earthquakes: ['getSnapshot'],
  'fire-perimeters': ['getSnapshot'],
  'tenant-cctv': ['getCatalog', 'getHealth', 'getFrameUrl', 'getMediaUrl'],
  'satellite-tasking': ['getSnapshot'],
  'uas-live': ['getSnapshot', 'getStreamUrl', 'getMediaUrl'],
});

export function validateOsAtlasSources(sources) {
  for (const [name, methods] of Object.entries(OS_ATLAS_SOURCE_METHODS)) {
    if (
      methods.some((method) => typeof sources?.[name]?.[method] !== 'function')
    )
      throw new TypeError(`Invalid OS Atlas catalog source: ${name}`);
  }
}

export function buildOsAtlasCatalogLayers({
  surface,
  sources,
  weatherClock,
  vesselOptions,
  resolveAsset,
}) {
  const layers = [
    createApplicationLocalAdsb({
      surface,
      enrichment: null,
      displayParams: () => ({ models3d: false, models3dMode: 'off' }),
      ...(resolveAsset ? { resolveAsset } : {}),
    }),
    createApplicationEarthquakes({ source: sources.earthquakes }),
    createApplicationFirePerimeters({ source: sources['fire-perimeters'] }),
    createApplicationFirms({
      surface,
      id: 'local-firms',
      name: 'FIRMS Active Fires',
      icon: '▲',
      source: 'NASA FIRMS · tenant',
      feed: sources.firms,
    }),
    createWindLayer({ feed: sources.wind, clock: weatherClock }),
    createWeatherLayer({
      feed: sources.weather,
      id: 'weather-radar',
      clock: weatherClock,
    }),
    createWeatherLayer({
      feed: sources.weather,
      id: 'weather-satellite',
      clock: weatherClock,
    }),
    createWeatherLayer({
      feed: sources.weather,
      id: 'weather-lightning',
      clock: weatherClock,
    }),
    createCyclonesLayer({ feed: sources.cyclones }),
    ...createMoroccoSitePackLayers(localGeoJsonServices),
    createPlatformStubLayer({
      id: 'tenant-cctv',
      name: 'Tenant CCTV',
      icon: '📷',
      source: 'Customer VMS',
      statusMessage: 'Configure cameras in tenant registry',
    }),
    createPlatformStubLayer({
      id: 'satellite-tasking',
      name: 'Satellite tasking',
      icon: '🛰',
      source: 'Commercial SAT',
      statusMessage: 'Awaiting satellite provider credentials',
    }),
    createUasLiveLayer({ source: sources['uas-live'] }),
  ];
  if (isTenantAisEnabled()) {
    layers.splice(
      1,
      0,
      createApplicationVessels({
        source: sources.vessels,
        options: vesselOptions,
      }),
    );
  }
  return layers;
}

export function resolveOsAtlasLayerMetadata() {
  if (isTenantAisEnabled()) return OS_ATLAS_LAYER_METADATA;
  return OS_ATLAS_LAYER_METADATA.filter(
    (entry) => entry.id !== 'ais-live-vessels',
  );
}

export function createOsAtlasCatalog({
  surface,
  sources,
  signal,
  metadata = resolveOsAtlasLayerMetadata(),
  vesselOptions,
  resolveAsset,
}) {
  validateOsAtlasSources(sources);
  const weatherClock = createWeatherClock();
  const dispose = () => {
    signal.removeEventListener('abort', dispose);
    weatherClock.destroy();
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const catalog = createLayerCatalog(
      buildOsAtlasCatalogLayers({
        surface,
        sources,
        weatherClock,
        vesselOptions,
        resolveAsset,
      }),
      metadata,
    );
    return Object.freeze({
      ...catalog,
      militaryRegistry: null,
      surface,
      weatherClock,
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
