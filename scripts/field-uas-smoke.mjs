#!/usr/bin/env node
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { uasApiProxy } from '../server/providers/uas.js';
import { missionApiProxy } from '../server/providers/mission.js';
import { resetUasStore } from '../server/product/uas-store.js';
import { resetMissionStore } from '../server/product/mission-store.js';

function install(plugin) {
  const routes = new Map();
  plugin.configureServer({
    middlewares: { use: (r, h) => routes.set(r, h) },
  });
  return routes;
}

function req(routes, mount, { method = 'GET', url = '/', body = '' } = {}) {
  const handler = routes.get(mount);
  return new Promise((resolve, reject) => {
    const request = Readable.from(body ? [Buffer.from(body)] : []);
    Object.assign(request, { method, url, headers: {}, socket: { remoteAddress: '127.0.0.1' } });
    const res = {
      statusCode: 200,
      setHeader() {},
      end(payload = '') {
        resolve({ status: this.statusCode, json: () => JSON.parse(String(payload)) });
      },
    };
    Promise.resolve(handler(request, res)).catch(reject);
  });
}

resetUasStore();
resetMissionStore();

const missions = install(missionApiProxy());
const uas = install(uasApiProxy());

const created = await req(missions, '/api/missions', {
  method: 'POST',
  url: '/',
  body: JSON.stringify({ title: 'Field smoke' }),
});
const missionId = created.json().data.mission.id;

await req(missions, '/api/missions', {
  method: 'POST',
  url: `/${missionId}/phase`,
  body: JSON.stringify({ phase: 'live' }),
});

await req(uas, '/api/uas', {
  method: 'POST',
  url: '/telemetry',
  body: JSON.stringify({
    assetId: 'smoke-uas',
    missionId,
    samples: [{ lat: 33.57, lon: -7.59, altM: 100 }],
  }),
});

const snap = await req(uas, '/api/uas', { url: '/snapshot' });
assert.equal(snap.json().data.aircraft.length, 1);

const exported = await req(missions, '/api/missions', {
  url: `/${missionId}/evidence/export`,
});
assert.equal(exported.status, 200);

console.log('field-uas-smoke OK');
