#!/usr/bin/env node
import { createIngestClient } from './lib/ingest-client.mjs';
import { createSimulatedTelemetryProvider } from './providers/simulated.mjs';
import { createTelemetryJsonProvider } from './providers/telemetry-json.mjs';
import { startFfmpegHlsBridge } from './providers/ffmpeg-hls.mjs';
import { startDjiBridgeHttp } from './providers/dji-bridge-http.mjs';

const base = process.env.OS_ATLAS_BASE || 'http://127.0.0.1:5173';
const token = process.env.OS_ATLAS_UAS_INGEST_TOKEN || '';
const assetId = process.env.UAS_EDGE_ASSET_ID || 'dji-edge-01';
const missionId = process.env.UAS_EDGE_MISSION_ID || null;
const lat0 = Number(process.env.UAS_EDGE_LAT || 33.5731);
const lon0 = Number(process.env.UAS_EDGE_LON || -7.5898);
const mode = (process.env.UAS_EDGE_TELEMETRY_MODE || 'simulated').toLowerCase();
const jsonPath = process.env.UAS_EDGE_TELEMETRY_JSON || '';
const rtspUrl = process.env.UAS_EDGE_RTSP_URL || '';
const hlsPort = Number(process.env.UAS_EDGE_HLS_PORT || 8099);
const bridgePort = Number(process.env.UAS_EDGE_DJI_BRIDGE_PORT || 8098);

if (!token) {
  console.error('Set OS_ATLAS_UAS_INGEST_TOKEN');
  process.exit(1);
}

const client = createIngestClient({ base, token });
let hlsBridge = { hlsUrl: null, stop: () => {} };
if (rtspUrl) {
  hlsBridge = startFfmpegHlsBridge({ rtspUrl, port: hlsPort });
  console.log(`HLS bridge: ${hlsBridge.hlsUrl}`);
}

const video = hlsBridge.hlsUrl
  ? { feedType: 'hls', upstreamUrl: hlsBridge.hlsUrl }
  : process.env.UAS_EDGE_VIDEO_HLS
    ? { feedType: 'hls', upstreamUrl: process.env.UAS_EDGE_VIDEO_HLS }
    : { feedType: 'none' };

await client.post('/api/uas/assets', {
  assetId,
  label: process.env.UAS_EDGE_LABEL || 'Edge DJI-class UAS',
  linkType: 'edge',
  airframe: 'quad',
  payload: 'eo',
  missionId,
  video,
});

async function pushSample(sample) {
  await client.post('/api/uas/telemetry', {
    assetId,
    missionId,
    samples: [sample],
  });
}

let timer;
if (mode === 'json' && jsonPath) {
  timer = createTelemetryJsonProvider({ filePath: jsonPath, onSample: pushSample }).start(
    1000,
  );
} else if (mode === 'dji-bridge') {
  startDjiBridgeHttp({ port: bridgePort, onSample: pushSample });
  console.log(`DJI bridge HTTP :${bridgePort}/sample`);
} else {
  timer = createSimulatedTelemetryProvider({ lat0, lon0, onSample: pushSample }).start(
    1000,
  );
}

console.log(`Registered ${assetId} → ${base} (telemetry=${mode})`);

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  hlsBridge.stop();
  process.exit(0);
});
