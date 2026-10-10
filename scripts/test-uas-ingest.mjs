#!/usr/bin/env node
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { uasApiProxy } from '../server/providers/uas.js';
import { missionApiProxy } from '../server/providers/mission.js';
import { resetUasStore } from '../server/product/uas-store.js';
import { resetMissionStore } from '../server/product/mission-store.js';

const UAS_ROUTE = '/api/uas';
const MISSION_ROUTE = '/api/missions';

function install(plugin) {
  const routes = new Map();
  const server = {
    middlewares: {
      use(route, handler) {
        routes.set(route, handler);
      },
    },
  };
  plugin.configureServer(server);
  return routes;
}

function request(routes, mount, { method = 'GET', url = '/', body = '' } = {}) {
  const handler = routes.get(mount);
  assert.ok(handler, `missing mount ${mount}`);
  return new Promise((resolve, reject) => {
    const req = Readable.from(body ? [Buffer.from(body)] : []);
    Object.assign(req, { method, url, headers: {} });
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      end(payload = '') {
        resolve({
          status: this.statusCode,
          headers: this.headers,
          body: String(payload),
          json: () => JSON.parse(String(payload)),
        });
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

resetUasStore();
resetMissionStore();

const uasRoutes = install(uasApiProxy());
const missionRoutes = install(missionApiProxy());

const created = await request(missionRoutes, MISSION_ROUTE, {
  method: 'POST',
  url: '/',
  body: JSON.stringify({ title: 'UAS test' }),
});
assert.equal(created.status, 201);
const missionId = created.json().data.mission.id;

await request(uasRoutes, UAS_ROUTE, {
  method: 'POST',
  url: '/assets',
  body: JSON.stringify({
    assetId: 'test-uas',
    label: 'Test',
    linkType: 'edge',
    airframe: 'quad',
  }),
});

assert.equal(
  (
    await request(uasRoutes, UAS_ROUTE, {
      method: 'POST',
      url: '/telemetry',
      body: JSON.stringify({
        assetId: 'test-uas',
        missionId,
        samples: [{ lat: 33.5, lon: -7.5, altM: 100 }],
      }),
    })
  ).status,
  200,
);

const snap = await request(uasRoutes, UAS_ROUTE, { url: '/snapshot' });
assert.equal(snap.json().data.aircraft.length, 1);

await request(uasRoutes, UAS_ROUTE, {
  method: 'POST',
  url: `/missions/${missionId}/upload`,
  body: JSON.stringify({
    assetId: 'test-uas',
    waypoints: { type: 'LineString', coordinates: [[-7.5, 33.5]] },
  }),
});

console.log('test:uas-ingest OK');
