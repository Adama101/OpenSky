/** Point-in-AOI check for live mission telemetry (bbox from mission coverage). */
export function missionLiveBbox(mission) {
  if (!mission || mission.phase !== 'live') return null;
  const bbox = mission.coverage?.bbox;
  if (!bbox || bbox.length !== 4) return null;
  return bbox;
}

export function sampleInsideBbox(bbox, lat, lon) {
  if (!bbox) return true;
  const [w, s, e, n] = bbox;
  return lon >= w && lon <= e && lat >= s && lat <= n;
}
