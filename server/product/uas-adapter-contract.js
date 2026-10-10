const PHASES = new Set(['brief', 'live', 'review']);

export function apiSuccess(data, meta = null) {
  return { success: true, data, error: null, meta };
}

export function apiError(message, code = 'invalid_request') {
  return { success: false, data: null, error: { code, message }, meta: null };
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateRegisterAsset(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const assetId = String(body.assetId || '').trim();
  if (!assetId || assetId.length > 128) return 'assetId required (max 128 chars)';
  const label = String(body.label || assetId).slice(0, 256);
  const linkType = String(body.linkType || 'unknown').slice(0, 64);
  const airframe = String(body.airframe || 'unknown').slice(0, 128);
  const payload = String(body.payload || '').slice(0, 128);
  let video = null;
  if (body.video != null) {
    if (typeof body.video !== 'object') return 'video must be an object';
    const feedType = String(body.video.feedType || 'hls').toLowerCase();
    if (!['hls', 'rtsp', 'none'].includes(feedType))
      return 'video.feedType must be hls, rtsp, or none';
    const upstreamUrl =
      body.video.upstreamUrl != null
        ? String(body.video.upstreamUrl).trim()
        : '';
    if (feedType !== 'none' && !upstreamUrl) return 'video.upstreamUrl required';
    video = Object.freeze({ feedType, upstreamUrl });
  }
  return Object.freeze({
    assetId,
    label,
    linkType,
    airframe,
    payload,
    video,
    missionId: body.missionId ? String(body.missionId) : null,
  });
}

export function validateTelemetryBatch(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const assetId = String(body.assetId || '').trim();
  if (!assetId) return 'assetId required';
  const missionId = body.missionId ? String(body.missionId) : null;
  const samples = body.samples;
  if (!Array.isArray(samples) || samples.length === 0)
    return 'samples must be a non-empty array';
  if (samples.length > 500) return 'samples max 500 per request';
  const normalized = [];
  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') return 'invalid sample';
    const t = sample.t ?? sample.time ?? sample.timestamp;
    const iso =
      typeof t === 'string'
        ? t
        : isFiniteNumber(t)
          ? new Date(t).toISOString()
          : new Date().toISOString();
    if (!isFiniteNumber(sample.lat) || !isFiniteNumber(sample.lon))
      return 'sample lat/lon required';
    normalized.push(
      Object.freeze({
        t: iso,
        lat: sample.lat,
        lon: sample.lon,
        altM: isFiniteNumber(sample.altM) ? sample.altM : null,
        headingDeg: isFiniteNumber(sample.headingDeg) ? sample.headingDeg : null,
        groundSpeedMps: isFiniteNumber(sample.groundSpeedMps)
          ? sample.groundSpeedMps
          : null,
        mode: sample.mode != null ? String(sample.mode).slice(0, 64) : null,
      }),
    );
  }
  return Object.freeze({ assetId, missionId, samples: normalized });
}

export function validateDetectionsBatch(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const assetId = String(body.assetId || '').trim();
  if (!assetId) return 'assetId required';
  const missionId = body.missionId ? String(body.missionId) : null;
  const detections = body.detections;
  if (!Array.isArray(detections)) return 'detections must be an array';
  if (detections.length > 200) return 'detections max 200';
  const normalized = detections.map((d) =>
    Object.freeze({
      t: d?.t ? String(d.t) : new Date().toISOString(),
      label: String(d?.label || 'object').slice(0, 128),
      lat: isFiniteNumber(d?.lat) ? d.lat : null,
      lon: isFiniteNumber(d?.lon) ? d.lon : null,
      confidence: isFiniteNumber(d?.confidence) ? d.confidence : null,
      aisMmsi: d?.aisMmsi != null ? String(d.aisMmsi) : null,
    }),
  );
  return Object.freeze({ assetId, missionId, detections: normalized });
}

export function validateMissionPhase(phase) {
  const normalized = String(phase || '').trim().toLowerCase();
  if (!PHASES.has(normalized)) return null;
  return normalized;
}

export function validateUploadMission(body) {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const assetId = String(body.assetId || '').trim();
  if (!assetId) return 'assetId required';
  const waypoints = body.waypoints;
  if (waypoints != null && typeof waypoints !== 'object')
    return 'waypoints must be GeoJSON';
  return Object.freeze({ assetId, waypoints: waypoints ?? null });
}
