import { readRequestBody } from './common/request.js';
import {
  apiError,
  apiSuccess,
  validateDetectionsBatch,
  validateRegisterAsset,
  validateTelemetryBatch,
  validateUploadMission,
} from '../product/uas-adapter-contract.js';
import { attachWaypoints } from '../product/mission-store.js';
import {
  buildSnapshot,
  getAsset,
  getHealth,
  getTrail,
  ingestDetections,
  ingestTelemetry,
  registerAsset,
} from '../product/uas-store.js';
import { validateEdgeVideoUrl } from '../product/uas-edge-url.js';
import { createUasHlsPuller, handleUasMediaRequest } from './uas-media.js';
import { enforceUasTelemetryRateLimit } from './uas-rate-limit.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const text = await readRequestBody(req);
  if (!text) return {};
  return JSON.parse(text);
}

export function uasApiProxy() {
  const puller = createUasHlsPuller();
  const install = (middlewares) => {
    middlewares.use('/api/uas', async (req, res) => {
      const url = req.url || '';
      const [pathPart] = url.split('?');
      const path = pathPart || '';

      try {
        if (req.method === 'GET' && (path === '/health' || path === '/health/')) {
          sendJson(res, 200, apiSuccess({ assets: getHealth() }));
          return;
        }
        if (req.method === 'GET' && (path === '/snapshot' || path === '/snapshot/')) {
          sendJson(res, 200, apiSuccess(buildSnapshot()));
          return;
        }
        if (path.startsWith('/media/')) {
          await handleUasMediaRequest(req, res, path, puller);
          return;
        }
        const streamMatch = path.match(/^\/stream\/([^/]+)$/);
        if (req.method === 'GET' && streamMatch) {
          const assetId = decodeURIComponent(streamMatch[1]);
          const asset = getAsset(assetId);
          if (!asset) {
            sendJson(res, 404, apiError('asset not found', 'not_found'));
            return;
          }
          const feedType = asset.video?.feedType || 'none';
          sendJson(
            res,
            200,
            apiSuccess({
              assetId,
              feedType,
              mediaUrl:
                feedType === 'hls'
                  ? `/api/uas/media/${encodeURIComponent(assetId)}`
                  : null,
            }),
          );
          return;
        }
        const trailMatch = path.match(/^\/trail\/([^/]+)$/);
        if (req.method === 'GET' && trailMatch) {
          const assetId = decodeURIComponent(trailMatch[1]);
          sendJson(res, 200, apiSuccess({ trail: getTrail(assetId) }));
          return;
        }
        if (req.method === 'POST' && (path === '/assets' || path === '/assets/')) {
          const body = await readJson(req);
          const validated = validateRegisterAsset(body);
          if (typeof validated === 'string') {
            sendJson(res, 400, apiError(validated, 'invalid_request'));
            return;
          }
          if (validated.video?.upstreamUrl) {
            const checked = validateEdgeVideoUrl(validated.video.upstreamUrl);
            if (!checked.ok) {
              sendJson(res, 400, apiError(checked.reason, 'invalid_request'));
              return;
            }
          }
          const asset = registerAsset(validated);
          sendJson(res, 201, apiSuccess({ asset }));
          return;
        }
        if (req.method === 'POST' && (path === '/telemetry' || path === '/telemetry/')) {
          if (!enforceUasTelemetryRateLimit(req, res)) return;
          const body = await readJson(req);
          const validated = validateTelemetryBatch(body);
          if (typeof validated === 'string') {
            sendJson(res, 400, apiError(validated, 'invalid_request'));
            return;
          }
          const count = ingestTelemetry(validated);
          sendJson(res, 200, apiSuccess({ accepted: count }));
          return;
        }
        if (req.method === 'POST' && (path === '/detections' || path === '/detections/')) {
          const body = await readJson(req);
          const validated = validateDetectionsBatch(body);
          if (typeof validated === 'string') {
            sendJson(res, 400, apiError(validated, 'invalid_request'));
            return;
          }
          const count = ingestDetections(validated);
          sendJson(res, 200, apiSuccess({ accepted: count }));
          return;
        }
        const uploadMatch = path.match(/^\/missions\/([^/]+)\/upload$/);
        if (req.method === 'POST' && uploadMatch) {
          const missionId = decodeURIComponent(uploadMatch[1]);
          const body = await readJson(req);
          const validated = validateUploadMission(body);
          if (typeof validated === 'string') {
            sendJson(res, 400, apiError(validated, 'invalid_request'));
            return;
          }
          const mission = attachWaypoints(
            missionId,
            validated.assetId,
            validated.waypoints,
          );
          if (!mission) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          registerAsset({
            assetId: validated.assetId,
            label: validated.assetId,
            linkType: 'mission',
            airframe: 'unknown',
            payload: '',
            video: null,
            missionId,
          });
          sendJson(res, 200, apiSuccess({ mission }));
          return;
        }
        sendJson(res, 404, apiError('not found', 'not_found'));
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(res, 400, apiError('invalid_json', 'invalid_json'));
          return;
        }
        if (error?.code === 'BODY_TOO_LARGE') {
          sendJson(res, 413, apiError('body too large', 'body_too_large'));
          return;
        }
        sendJson(res, 500, apiError('server_error', 'server_error'));
      }
    });
  };
  return {
    name: 'uas-api',
    configureServer(server) {
      install(server.middlewares);
      server.httpServer?.on('close', () => {
        puller.shutdown();
      });
    },
    configurePreviewServer(server) {
      install(server.middlewares);
      server.httpServer?.on('close', () => {
        puller.shutdown();
      });
    },
  };
}
