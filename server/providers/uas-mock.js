/** Dev-only mock telemetry generator when UAS_MOCK_ENABLED=1. */
import { registerAsset, ingestTelemetry } from '../product/uas-store.js';

const MOCK_ASSET = 'mock-dji-01';

export function uasMockPlugin() {
  let timer = null;
  let angle = 0;
  const install = () => {
    if (process.env.UAS_MOCK_ENABLED !== '1') return;
    registerAsset({
      assetId: MOCK_ASSET,
      label: 'Mock DJI-class UAS',
      linkType: 'edge',
      airframe: 'quad',
      payload: 'eo',
      video: {
        feedType: 'none',
        upstreamUrl: '',
      },
      missionId: null,
    });
    const base = { lat: 33.5731, lon: -7.5898 };
    timer = setInterval(() => {
      angle += 0.02;
      const lat = base.lat + Math.sin(angle) * 0.01;
      const lon = base.lon + Math.cos(angle) * 0.01;
      ingestTelemetry({
        assetId: MOCK_ASSET,
        missionId: null,
        samples: [
          {
            t: new Date().toISOString(),
            lat,
            lon,
            altM: 120 + Math.sin(angle) * 10,
            headingDeg: ((angle * 180) / Math.PI) % 360,
            groundSpeedMps: 8,
            mode: 'auto',
          },
        ],
      });
    }, 1000);
  };
  return {
    name: 'uas-mock',
    configureServer(server) {
      install();
      return () => {
        if (timer) clearInterval(timer);
      };
    },
    configurePreviewServer(server) {
      install();
      return () => {
        if (timer) clearInterval(timer);
      };
    },
  };
}
