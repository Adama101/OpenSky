import { randomUUID } from 'node:crypto';
import { validateMissionPhase } from './uas-adapter-contract.js';
import {
  DEFAULT_MISSIONS_PATH,
  loadMissionSnapshot,
  saveMissionSnapshot,
} from './mission-persist.js';

const missions = new Map();
/** @type {{ t: string, action: string, missionId?: string, detail?: string }[]} */
const auditLog = [];

let missionsFilePath = process.env.OS_ATLAS_MISSIONS_PATH || DEFAULT_MISSIONS_PATH;

function persist() {
  try {
    saveMissionSnapshot(
      [...missions.values()].map((m) => JSON.parse(JSON.stringify(m))),
      [...auditLog],
      missionsFilePath,
    );
  } catch {
    /* field dev */
  }
}

function hydrateFromDisk() {
  const snapshot = loadMissionSnapshot(missionsFilePath);
  if (!snapshot) return;
  missions.clear();
  auditLog.length = 0;
  for (const mission of snapshot.missions) {
    if (mission?.id) missions.set(mission.id, mission);
  }
  if (Array.isArray(snapshot.auditLog)) auditLog.push(...snapshot.auditLog);
}

hydrateFromDisk();

function pushAudit(action, missionId, detail = '') {
  auditLog.push({
    t: new Date().toISOString(),
    action,
    missionId,
    detail: detail ? String(detail).slice(0, 512) : '',
  });
  if (auditLog.length > 5000) auditLog.splice(0, auditLog.length - 5000);
}

function emptyMission(overrides = {}) {
  const now = new Date().toISOString();
  return Object.freeze({
    id: randomUUID(),
    title: 'Untitled mission',
    phase: 'brief',
    createdAt: now,
    updatedAt: now,
    aois: [],
    objectives: [],
    assignedAssetIds: [],
    approvalStatus: 'draft',
    startedAt: null,
    endedAt: null,
    coverage: null,
    waypointsByAsset: {},
    evidence: [],
    ...overrides,
  });
}

function cloneMission(record) {
  return JSON.parse(JSON.stringify(record));
}

function computeCoverage(mission) {
  const points = [];
  for (const aoi of mission.aois || []) {
    const coords = aoi?.geometry?.coordinates;
    if (!coords) continue;
    const ring = aoi.geometry.type === 'Polygon' ? coords[0] : null;
    if (Array.isArray(ring)) {
      for (const c of ring) {
        if (Array.isArray(c) && c.length >= 2) points.push([c[0], c[1]]);
      }
    }
  }
  if (points.length === 0) return null;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return Object.freeze({
    bbox: [minLon, minLat, maxLon, maxLat],
    pointCount: points.length,
  });
}

export function listMissions() {
  return [...missions.values()].map(cloneMission);
}

export function getMission(id) {
  const mission = missions.get(id);
  return mission ? cloneMission(mission) : null;
}

export function createMission(parsed) {
  const mission = emptyMission({
    title: String(parsed.title || 'Untitled mission').slice(0, 256),
    phase: validateMissionPhase(parsed.phase) || 'brief',
    aois: Array.isArray(parsed.aois) ? parsed.aois : [],
    objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
    assignedAssetIds: Array.isArray(parsed.assignedAssetIds)
      ? parsed.assignedAssetIds.map(String)
      : [],
  });
  const withCoverage = {
    ...mission,
    coverage: computeCoverage(mission),
  };
  missions.set(mission.id, withCoverage);
  pushAudit('mission.create', mission.id, mission.title);
  persist();
  return cloneMission(withCoverage);
}

export function patchMission(id, patch) {
  const prev = missions.get(id);
  if (!prev) return null;
  const next = { ...prev, updatedAt: new Date().toISOString() };
  if (patch.title != null) next.title = String(patch.title).slice(0, 256);
  if (patch.aois != null && Array.isArray(patch.aois)) next.aois = patch.aois;
  if (patch.objectives != null && Array.isArray(patch.objectives))
    next.objectives = patch.objectives;
  if (patch.assignedAssetIds != null && Array.isArray(patch.assignedAssetIds))
    next.assignedAssetIds = patch.assignedAssetIds.map(String);
  if (patch.approvalStatus != null)
    next.approvalStatus = String(patch.approvalStatus).slice(0, 64);
  if (patch.phase != null) {
    const phase = validateMissionPhase(patch.phase);
    if (phase) {
      next.phase = phase;
      if (phase === 'live' && !next.startedAt)
        next.startedAt = new Date().toISOString();
      if (phase === 'review' && !next.endedAt)
        next.endedAt = new Date().toISOString();
    }
  }
  next.coverage = computeCoverage(next);
  missions.set(id, next);
  pushAudit('mission.patch', id);
  persist();
  return cloneMission(next);
}

export function setMissionPhase(id, phase) {
  return patchMission(id, { phase });
}

export function attachWaypoints(missionId, assetId, waypoints) {
  const prev = missions.get(missionId);
  if (!prev) return null;
  const assignedAssetIds = prev.assignedAssetIds.includes(assetId)
    ? prev.assignedAssetIds
    : [...prev.assignedAssetIds, assetId];
  const waypointsByAsset = {
    ...prev.waypointsByAsset,
    [assetId]: waypoints,
  };
  return patchMission(missionId, { waypointsByAsset, assignedAssetIds });
}

export function addEvidence(missionId, entry) {
  const prev = missions.get(missionId);
  if (!prev) return null;
  const evidence = [
    ...prev.evidence,
    Object.freeze({
      id: randomUUID(),
      t: entry.t || new Date().toISOString(),
      kind: String(entry.kind || 'note').slice(0, 64),
      lat: entry.lat ?? null,
      lon: entry.lon ?? null,
      aisMmsi: entry.aisMmsi != null ? String(entry.aisMmsi) : null,
      note: entry.note != null ? String(entry.note).slice(0, 2000) : null,
      payload: entry.payload ?? null,
    }),
  ];
  const next = { ...prev, evidence, updatedAt: new Date().toISOString() };
  missions.set(missionId, next);
  pushAudit('mission.evidence', missionId, entry.kind);
  persist();
  return cloneMission(next);
}

export function searchMissions({ bbox, phase, assetId } = {}) {
  let results = listMissions();
  if (phase) {
    const p = validateMissionPhase(phase);
    if (p) results = results.filter((m) => m.phase === p);
  }
  if (assetId) {
    const id = String(assetId);
    results = results.filter((m) => m.assignedAssetIds.includes(id));
  }
  if (bbox) {
    const parts = String(bbox)
      .split(',')
      .map((n) => Number(n.trim()));
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      const [w, s, e, n] = parts;
      results = results.filter((m) => {
        const b = m.coverage?.bbox;
        if (!b) return false;
        return !(b[2] < w || b[0] > e || b[3] < s || b[1] > n);
      });
    }
  }
  return results;
}

export function getAuditLog(limit = 100) {
  return auditLog.slice(-limit);
}

export function buildEvidenceExport(missionId, { telemetrySamples = [] } = {}) {
  const mission = getMission(missionId);
  if (!mission) return null;
  return Object.freeze({
    exportedAt: new Date().toISOString(),
    mission,
    telemetrySamples,
    auditTail: getAuditLog(50).filter((e) => e.missionId === missionId),
  });
}

/** Test helper */
export function resetMissionStore() {
  missions.clear();
  auditLog.length = 0;
}
