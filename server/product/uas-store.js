import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEvidence, getMission } from './mission-store.js';
import { missionLiveBbox, sampleInsideBbox } from './mission-geofence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TELEMETRY_PATH = path.join(__dirname, '../data/uas-telemetry.jsonl');

/** @type {Map<string, object>} */
const assets = new Map();
/** @type {Map<string, { latest: object, trail: object[] }>} */
const tracks = new Map();
/** @type {Map<string, object[]>} missionId -> samples */
const telemetryByMission = new Map();

let telemetryLogPath = process.env.UAS_TELEMETRY_LOG || DEFAULT_TELEMETRY_PATH;
const RELOAD_HOURS = Number(process.env.UAS_TELEMETRY_RELOAD_HOURS || 24);
const TRAIL_MAX = 500;

export function setTelemetryLogPath(forPath) {
  telemetryLogPath = forPath;
}

function reloadTelemetryFromLog() {
  if (!fs.existsSync(telemetryLogPath)) return;
  const cutoff = Date.now() - RELOAD_HOURS * 3600_000;
  let text;
  try {
    text = fs.readFileSync(telemetryLogPath, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const point = JSON.parse(line);
      if (!point?.assetId || !Number.isFinite(point.lat)) continue;
      if (Date.parse(point.t) < cutoff) continue;
      const assetId = point.assetId;
      if (!tracks.has(assetId)) {
        tracks.set(assetId, { latest: null, trail: [] });
      }
      const track = tracks.get(assetId);
      track.trail.push(point);
      if (track.trail.length > TRAIL_MAX) track.trail.shift();
      track.latest = point;
      if (point.missionId) {
        const list = telemetryByMission.get(point.missionId) ?? [];
        list.push(point);
        telemetryByMission.set(point.missionId, list);
      }
    } catch {
      /* skip bad line */
    }
  }
}

function appendTelemetryLog(line) {
  try {
    fs.mkdirSync(path.dirname(telemetryLogPath), { recursive: true });
    fs.appendFileSync(telemetryLogPath, `${line}\n`, 'utf8');
  } catch {
    /* dev-only persistence */
  }
}

export function registerAsset(record) {
  const now = new Date().toISOString();
  const prev = assets.get(record.assetId);
  const next = Object.freeze({
    assetId: record.assetId,
    label: record.label,
    linkType: record.linkType,
    airframe: record.airframe,
    payload: record.payload,
    video: record.video,
    missionId: record.missionId ?? prev?.missionId ?? null,
    registeredAt: prev?.registeredAt ?? now,
    updatedAt: now,
    lastTelemetryAt: prev?.lastTelemetryAt ?? null,
    linkQuality: prev?.linkQuality ?? null,
  });
  assets.set(record.assetId, next);
  if (!tracks.has(record.assetId)) {
    tracks.set(record.assetId, { latest: null, trail: [] });
  }
  return next;
}

export function getAsset(assetId) {
  return assets.get(assetId) ?? null;
}

export function listAssets() {
  return [...assets.values()];
}

reloadTelemetryFromLog();

export function ingestTelemetry({ assetId, missionId, samples }) {
  if (!assets.has(assetId)) {
    registerAsset({
      assetId,
      label: assetId,
      linkType: 'unknown',
      airframe: 'unknown',
      payload: '',
      video: null,
      missionId,
    });
  }
  const asset = assets.get(assetId);
  const track = tracks.get(assetId);
  const accepted = [];
  const effectiveMissionId = missionId ?? asset.missionId;
  const mission = effectiveMissionId ? getMission(effectiveMissionId) : null;
  const bbox = missionLiveBbox(mission);
  for (const sample of samples) {
    const outOfBounds =
      bbox != null &&
      !sampleInsideBbox(bbox, sample.lat, sample.lon);
    const point = Object.freeze({
      assetId,
      missionId: effectiveMissionId,
      ...sample,
      outOfBounds: outOfBounds || undefined,
    });
    track.trail.push(point);
    if (track.trail.length > TRAIL_MAX) track.trail.shift();
    track.latest = point;
    accepted.push(point);
    if (point.missionId) {
      const key = point.missionId;
      const list = telemetryByMission.get(key) ?? [];
      list.push(point);
      telemetryByMission.set(key, list);
    }
    appendTelemetryLog(JSON.stringify(point));
  }
  assets.set(
    assetId,
    Object.freeze({
      ...asset,
      missionId: missionId ?? asset.missionId,
      lastTelemetryAt: track.latest?.t ?? asset.lastTelemetryAt,
      updatedAt: new Date().toISOString(),
      linkQuality: 'ok',
    }),
  );
  return accepted.length;
}

export function ingestDetections({ assetId, missionId, detections }) {
  if (missionId && detections.length > 0) {
    for (const d of detections) {
      addEvidence(missionId, {
        kind: 'detection',
        t: d.t,
        lat: d.lat,
        lon: d.lon,
        aisMmsi: d.aisMmsi,
        note: d.label,
        payload: { assetId, confidence: d.confidence },
      });
    }
  }
  return detections.length;
}

export function buildSnapshot() {
  const aircraft = [];
  const now = Date.now();
  for (const asset of assets.values()) {
    const track = tracks.get(asset.assetId);
    const latest = track?.latest;
    if (!latest) continue;
    const ageMs = now - Date.parse(latest.t);
    aircraft.push(
      Object.freeze({
        id: asset.assetId,
        label: asset.label,
        lat: latest.lat,
        lon: latest.lon,
        altM: latest.altM,
        headingDeg: latest.headingDeg,
        groundSpeedMps: latest.groundSpeedMps,
        mode: latest.mode,
        missionId: latest.missionId,
        stale: ageMs > 15_000,
        ageMs,
        lastTelemetryAt: latest.t,
      }),
    );
  }
  return Object.freeze({
    aircraft,
    stale: aircraft.length === 0,
    updatedAt: new Date().toISOString(),
  });
}

export function getHealth() {
  const now = Date.now();
  return listAssets().map((asset) => {
    const track = tracks.get(asset.assetId);
    const latest = track?.latest;
    const ageMs = latest ? now - Date.parse(latest.t) : null;
    return Object.freeze({
      assetId: asset.assetId,
      label: asset.label,
      linkType: asset.linkType,
      airframe: asset.airframe,
      missionId: asset.missionId,
      lastTelemetryAt: asset.lastTelemetryAt,
      video: asset.video,
      status:
        ageMs == null ? 'idle' : ageMs > 30_000 ? 'stale' : 'live',
      ageMs,
    });
  });
}

export function getMissionTelemetry(missionId, { at } = {}) {
  const series = telemetryByMission.get(missionId) ?? [];
  if (!at) return [...series];
  const target = Date.parse(at);
  if (!Number.isFinite(target)) return [];
  let best = null;
  let bestDelta = Infinity;
  for (const sample of series) {
    const delta = Math.abs(Date.parse(sample.t) - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = sample;
    }
  }
  return best ? [best] : [];
}

export function getTrail(assetId) {
  return tracks.get(assetId)?.trail ?? [];
}

export function resetUasStore() {
  assets.clear();
  tracks.clear();
  telemetryByMission.clear();
}
