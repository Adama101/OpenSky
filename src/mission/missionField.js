export const ACTIVE_MISSION_KEY = 'os-atlas:active-mission';

export function readActiveMissionId() {
  try {
    return String(sessionStorage.getItem(ACTIVE_MISSION_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function writeActiveMissionId(id) {
  try {
    if (id) sessionStorage.setItem(ACTIVE_MISSION_KEY, id);
    else sessionStorage.removeItem(ACTIVE_MISSION_KEY);
  } catch {
    /* ignore */
  }
}
