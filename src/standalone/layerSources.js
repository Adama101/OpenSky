import { isGevLegacy } from '../product/os-atlas.js';
import {
  createOpenSkySource,
  createAdsbLolSource,
  createAisStreamSource,
} from '../sources/live/standalone.js';
import { createCctvSource } from '../layers/cctv/source.js';
import { createRadioSource } from '../layers/radio/source.js';
import { createTransitSource } from '../layers/transit/source.js';
import { createTrafficSource } from '../layers/traffic/source.js';
import { createBikeshareSource } from '../layers/bikeshare/source.js';
import { createInstallationSource } from '../layers/installations/source.js';
import { createSatelliteSource } from '../layers/satellites/source.js';
import { createLaunchSource } from '../layers/launches/source.js';
import { createOverpassAlprSource } from '../layers/alpr/source.js';
import { createWeatherSource } from '../layers/weather/source.js';
import { createCycloneSource } from '../layers/cyclones/source.js';
import { createWindSource } from '../layers/wind/source.js';
import { createFirmsSource } from '../layers/firms/source.js';
import { createReferenceSources } from '../sources/reference.js';
import { createTenantCctvSource } from '../layers/tenant-cctv/source.js';
import { createSatelliteTaskingSource } from '../layers/satellite-tasking/source.js';
import { createUasLiveSource } from '../layers/uas-live/source.js';
import { isTenantAisEnabled } from '../product/tenant-config.js';

export { createReferenceSources as createStandaloneReferenceSources } from '../sources/reference.js';

function createOsAtlasLayerSources() {
  const sources = {
    ...createReferenceSources(),
    wind: createWindSource(),
    weather: createWeatherSource(),
    cyclones: createCycloneSource(),
    firms: createFirmsSource(),
    'tenant-cctv': createTenantCctvSource(),
    'satellite-tasking': createSatelliteTaskingSource(),
    'uas-live': createUasLiveSource(),
  };
  if (isTenantAisEnabled()) {
    sources.vessels = createAisStreamSource({
      apiUrl: import.meta.env?.VITE_AIS_LIVE_API_URL || '/api/ais-live',
    });
  } else {
    sources.vessels = {
      label: 'AIS (disabled)',
      async getSnapshot() {
        return {
          vessels: [],
          stale: true,
          message: 'Enable VITE_TENANT_AIS_ENABLED and server AISSTREAM_API_KEY',
        };
      },
    };
  }
  return sources;
}

function createGevLayerSources() {
  return {
    ...createReferenceSources(),
    flights: createOpenSkySource(),
    military: createAdsbLolSource(),
    vessels: createAisStreamSource({
      apiUrl: import.meta.env?.VITE_AIS_LIVE_API_URL || '/api/ais-live',
    }),
    cctv: createCctvSource(),
    radio: createRadioSource(),
    traffic: createTrafficSource(),
    transit: createTransitSource(),
    bikeshare: createBikeshareSource(),
    installations: createInstallationSource(),
    satellites: createSatelliteSource(),
    launches: createLaunchSource(),
    alpr: createOverpassAlprSource(),
    firms: createFirmsSource(),
    wind: createWindSource(),
    weather: createWeatherSource(),
    cyclones: createCycloneSource(),
  };
}

/** Select layer source providers for the active product profile. */
export function createStandaloneLayerSources() {
  return isGevLegacy() ? createGevLayerSources() : createOsAtlasLayerSources();
}

export { createGevLayerSources, createOsAtlasLayerSources };
