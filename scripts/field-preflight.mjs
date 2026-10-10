#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const base = process.env.OS_ATLAS_BASE || 'http://127.0.0.1:5173';
let ok = true;

function check(name, pass) {
  console.log(pass ? `OK  ${name}` : `FAIL ${name}`);
  if (!pass) ok = false;
}

check('OS_ATLAS_SESSION_TOKEN', Boolean(process.env.OS_ATLAS_SESSION_TOKEN));
check('OS_ATLAS_UAS_INGEST_TOKEN', Boolean(process.env.OS_ATLAS_UAS_INGEST_TOKEN));

try {
  const health = await fetch(`${base}/api/health`, { cache: 'no-store' });
  check('GET /api/health', health.ok);
} catch {
  check('GET /api/health (server running?)', false);
}

const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
check('ffmpeg available (RTSP bridge)', ffmpeg.status === 0);

if (!ok) process.exit(1);
console.log('field:preflight OK');
