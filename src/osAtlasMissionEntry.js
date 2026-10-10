import * as Cesium from 'cesium';
import { createSurfaceKeyboard } from './ui/surfaceKeyboard.js';

const STORAGE_KEY = 'os-atlas:mission-entry:v1';

const MISSIONS = Object.freeze([
  Object.freeze({
    id: 'morocco-perimeter',
    title: 'Morocco perimeter',
    subtitle: 'Site pack · weather · hazards',
    layers: ['morocco-site-pack', 'weather-radar', 'local-firms'],
    fly: Object.freeze({ latitude: 31.79, longitude: -7.09, rangeM: 1_200_000 }),
  }),
  Object.freeze({
    id: 'morocco-surface',
    title: 'Surface watch',
    subtitle: 'Tenant CCTV stub · local ADS-B edge',
    layers: ['tenant-cctv', 'local-adsb'],
    fly: Object.freeze({ latitude: 33.57, longitude: -7.59, rangeM: 800_000 }),
  }),
  Object.freeze({
    id: 'uas-live-demo',
    title: 'UAS live demo',
    subtitle: 'Vehicle Adapter · edge gateway',
    layers: ['uas-live', 'wind'],
    fly: Object.freeze({ latitude: 33.57, longitude: -7.59, rangeM: 400_000 }),
  }),
]);

function shouldShow(hasShareState) {
  if (hasShareState) return false;
  try {
    if (globalThis.sessionStorage?.getItem(STORAGE_KEY) === '1') return false;
  } catch {
    /* storage blocked */
  }
  return true;
}

function dismissSession() {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Mission-oriented entry replacing the public OSINT first-run launcher. */
export function initOsAtlasMissionEntry({
  styleManager,
  dataManager,
  documentRef = globalThis.document,
} = {}) {
  if (!shouldShow(styleManager?.hasShareState)) return null;

  const root = documentRef?.createElement?.('div');
  if (!root) return null;
  root.className = 'os-atlas-mission-entry';
  root.innerHTML = `
    <div class="os-atlas-mission-entry__panel" role="dialog" aria-labelledby="os-atlas-mission-title">
      <h2 id="os-atlas-mission-title">OS Atlas · Mission</h2>
      <p>Select an AOI to begin. Layer choices persist like manual toggles.</p>
      <div class="os-atlas-mission-entry__grid"></div>
      <button type="button" data-os-atlas-dismiss>Continue without mission</button>
    </div>`;
  const grid = root.querySelector('.os-atlas-mission-entry__grid');
  for (const mission of MISSIONS) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.dataset.osAtlasMission = mission.id;
    button.innerHTML = `<strong>${mission.title}</strong><span>${mission.subtitle}</span>`;
    grid?.append(button);
  }
  documentRef.body?.append(root);

  const close = () => {
    dismissSession();
    root.remove();
    keyboard?.destroy?.();
  };
  const keyboard = createSurfaceKeyboard({
    root,
    documentRef,
    isActive: () => root.isConnected,
    onEscape: close,
  });
  keyboard.activate();

  const applyMission = async (mission) => {
    for (const layerId of mission.layers) {
      void dataManager?.setEnabled?.(layerId, true, { origin: 'user' });
    }
    const viewer = styleManager?.viewer;
    if (viewer && mission.fly) {
      const { latitude, longitude, rangeM } = mission.fly;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, rangeM),
        duration: 2,
      });
    }
    close();
  };

  root.addEventListener('click', (event) => {
    const missionId = event.target?.closest?.('[data-os-atlas-mission]')?.dataset
      ?.osAtlasMission;
    if (missionId) {
      const mission = MISSIONS.find((entry) => entry.id === missionId);
      if (mission) void applyMission(mission);
      return;
    }
    if (event.target?.closest?.('[data-os-atlas-dismiss]')) close();
  });

  return { destroy: close };
}
