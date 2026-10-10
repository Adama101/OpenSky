import { createLocalGeoJsonLayer } from './localGeojsonCore.js';

const sitePackUrl = new URL(
  './local_data/morocco/site-pack.geojson',
  import.meta.url,
).href;

/** Morocco pilot site boundaries and reference AOIs (placeholder geometry). */
export function createMoroccoSitePackLayers(services) {
  return [
    createLocalGeoJsonLayer(
      {
        id: 'morocco-site-pack',
        url: sitePackUrl,
        name: 'Morocco site pack',
        color: '#c9a227',
        icon: '◆',
        source: 'OS Corp · tenant',
        labels: true,
        labelMax: 32,
        labelGridPx: 120,
      },
      services,
    ),
  ];
}
