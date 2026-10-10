import { readRequestBody } from './common/request.js';
import {
  addEvidence,
  createMission,
  getMission,
  listMissions,
  patchMission,
  searchMissions,
  setMissionPhase,
  buildEvidenceExport,
} from '../product/mission-store.js';
import { getMissionTelemetry as getUasMissionTelemetry } from '../product/uas-store.js';
import { apiError, apiSuccess } from '../product/uas-adapter-contract.js';

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

/** Mission API for OS Atlas (in-memory store; persistent backend later). */
export function missionApiProxy() {
  const install = (middlewares) => {
    middlewares.use('/api/missions', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const url = req.url || '';
      const [pathPart, queryPart] = url.split('?');
      const path = pathPart || '';
      const query = new URLSearchParams(queryPart || '');

      try {
        if (req.method === 'GET' && (path === '' || path === '/')) {
          sendJson(res, 200, apiSuccess({ missions: listMissions() }));
          return;
        }
        if (req.method === 'GET' && path === '/search') {
          const results = searchMissions({
            bbox: query.get('bbox') || undefined,
            phase: query.get('phase') || undefined,
            assetId: query.get('assetId') || undefined,
          });
          sendJson(res, 200, apiSuccess({ missions: results }));
          return;
        }
        const detailMatch = path.match(/^\/([^/]+)(\/.*)?$/);
        const missionId = detailMatch?.[1];
        const sub = detailMatch?.[2] || '';

        if (missionId && req.method === 'GET' && sub === '') {
          const mission = getMission(missionId);
          if (!mission) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          sendJson(res, 200, apiSuccess({ mission }));
          return;
        }
        if (missionId && req.method === 'PATCH' && sub === '') {
          const body = await readJson(req);
          const mission = patchMission(missionId, body);
          if (!mission) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          sendJson(res, 200, apiSuccess({ mission }));
          return;
        }
        if (missionId && req.method === 'POST' && sub === '/phase') {
          const body = await readJson(req);
          const mission = setMissionPhase(missionId, body.phase);
          if (!mission) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          sendJson(res, 200, apiSuccess({ mission }));
          return;
        }
        if (missionId && req.method === 'POST' && sub === '/evidence') {
          const body = await readJson(req);
          const mission = addEvidence(missionId, body);
          if (!mission) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          sendJson(res, 201, apiSuccess({ mission }));
          return;
        }
        if (missionId && req.method === 'GET' && sub === '/telemetry') {
          const at = query.get('at') || undefined;
          const series = getUasMissionTelemetry(missionId, { at });
          sendJson(res, 200, apiSuccess({ samples: series }));
          return;
        }
        if (missionId && req.method === 'GET' && sub === '/evidence/export') {
          const pack = buildEvidenceExport(missionId, {
            telemetrySamples: getUasMissionTelemetry(missionId),
          });
          if (!pack) {
            sendJson(res, 404, apiError('mission not found', 'not_found'));
            return;
          }
          sendJson(res, 200, apiSuccess({ export: pack }));
          return;
        }
        if (req.method === 'POST' && (path === '' || path === '/')) {
          const body = await readJson(req);
          const mission = createMission(body);
          sendJson(res, 201, apiSuccess({ mission }));
          return;
        }
        sendJson(res, 404, apiError('not found', 'not_found'));
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(res, 400, apiError('invalid_json', 'invalid_json'));
          return;
        }
        sendJson(res, 500, apiError('server_error', 'server_error'));
      }
    });
  };
  return {
    name: 'mission-api',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}
