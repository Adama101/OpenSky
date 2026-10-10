import { isOsAtlas } from '../product/os-atlas.js';
import { writeActiveMissionId } from './missionField.js';

function unwrap(payload) {
  return payload?.data ?? payload;
}

/** Mission panel (brief / live / review) backed by /api/missions. */
export function initMissionShell({
  documentRef = globalThis.document,
  dataManager = null,
} = {}) {
  if (!isOsAtlas()) return null;
  const host = documentRef?.createElement?.('aside');
  if (!host) return null;
  host.className = 'os-atlas-mission-shell';
  host.innerHTML = `
    <header><strong>Mission</strong></header>
    <nav>
      <button type="button" data-phase="brief" aria-pressed="true">Brief</button>
      <button type="button" data-phase="live">Live</button>
      <button type="button" data-phase="review">Review</button>
    </nav>
    <section data-mission-body>
      <label class="os-atlas-mission-shell__field">
        <span>Title</span>
        <input type="text" data-mission-title placeholder="Perimeter patrol" />
      </label>
      <button type="button" data-mission-create>Create mission</button>
      <label class="os-atlas-mission-shell__field">
        <span>Search phase</span>
        <select data-mission-search-phase>
          <option value="">All</option>
          <option value="brief">Brief</option>
          <option value="live">Live</option>
          <option value="review">Review</option>
        </select>
      </label>
      <button type="button" data-mission-search>Search missions</button>
      <ul data-mission-list></ul>
      <div data-mission-detail hidden>
        <p data-mission-meta></p>
        <label class="os-atlas-mission-shell__field">
          <span>Edge env · UAS_EDGE_MISSION_ID</span>
          <input type="text" data-mission-id-copy readonly />
        </label>
        <label class="os-atlas-mission-shell__field">
          <span>AOI GeoJSON (Polygon)</span>
          <textarea data-mission-aoi rows="4" placeholder='{"type":"Polygon","coordinates":[...]}'></textarea>
        </label>
        <button type="button" data-mission-save-aoi>Save AOI</button>
        <button type="button" data-mission-go-live>Start live</button>
        <button type="button" data-mission-go-review>End · review</button>
        <label class="os-atlas-mission-shell__field">
          <span>Evidence note (optional AIS MMSI)</span>
          <input type="text" data-mission-evidence placeholder="Visual on target · MMSI 123456789" />
        </label>
        <button type="button" data-mission-add-evidence>Add evidence</button>
        <button type="button" data-mission-export>Export evidence JSON</button>
        <div data-mission-replay hidden>
          <label class="os-atlas-mission-shell__field">
            <span>Replay time (ISO)</span>
            <input type="text" data-mission-replay-at />
          </label>
          <input type="range" data-mission-replay-slider min="0" max="100" value="0" />
          <button type="button" data-mission-replay-fetch>Load telemetry at time</button>
          <pre data-mission-replay-out></pre>
        </div>
      </div>
    </section>`;
  documentRef.body?.append(host);

  const list = host.querySelector('[data-mission-list]');
  const detail = host.querySelector('[data-mission-detail]');
  const meta = host.querySelector('[data-mission-meta]');
  const titleInput = host.querySelector('[data-mission-title]');
  const aoiInput = host.querySelector('[data-mission-aoi]');
  const replayBlock = host.querySelector('[data-mission-replay]');
  const replayAt = host.querySelector('[data-mission-replay-at]');
  const replayOut = host.querySelector('[data-mission-replay-out]');
  const replaySlider = host.querySelector('[data-mission-replay-slider]');

  let uiPhase = 'brief';
  let selectedId = null;
  let missionsCache = [];

  const renderList = (missions) => {
    missionsCache = missions;
    if (!list) return;
    list.textContent = '';
    for (const mission of missions) {
      const item = documentRef.createElement('li');
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.dataset.missionId = mission.id;
      button.textContent = `${mission.title} · ${mission.phase}`;
      if (mission.id === selectedId) button.setAttribute('aria-current', 'true');
      item.append(button);
      list.append(item);
    }
  };

  const idCopy = host.querySelector('[data-mission-id-copy]');

  const showDetail = (mission) => {
    if (!mission || !detail || !meta) return;
    selectedId = mission.id;
    writeActiveMissionId(mission.id);
    detail.hidden = false;
    meta.textContent = `ID ${mission.id.slice(0, 8)}… · ${mission.approvalStatus} · assets: ${(mission.assignedAssetIds || []).join(', ') || 'none'}`;
    if (idCopy) idCopy.value = mission.id;
    if (titleInput) titleInput.value = mission.title || '';
    if (aoiInput) {
      const first = mission.aois?.[0]?.geometry;
      aoiInput.value = first ? JSON.stringify(first) : '';
    }
    if (replayBlock) replayBlock.hidden = uiPhase !== 'review';
  };

  const refresh = async () => {
    try {
      const response = await fetch('/api/missions', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = unwrap(await response.json());
      renderList(payload.missions || []);
      const current = (payload.missions || []).find((m) => m.id === selectedId);
      if (current) showDetail(current);
    } catch {
      /* auth or network */
    }
  };

  host.addEventListener('click', async (event) => {
    const phaseButton = event.target?.closest?.('[data-phase]');
    if (phaseButton) {
      uiPhase = phaseButton.dataset.phase || 'brief';
      host.querySelectorAll('[data-phase]').forEach((node) => {
        node.setAttribute(
          'aria-pressed',
          node.dataset.phase === uiPhase ? 'true' : 'false',
        );
      });
      if (replayBlock) replayBlock.hidden = uiPhase !== 'review';
      return;
    }
    const pick = event.target?.closest?.('[data-mission-id]');
    if (pick?.dataset?.missionId) {
      const mission = missionsCache.find((m) => m.id === pick.dataset.missionId);
      if (mission) showDetail(mission);
      return;
    }
    if (event.target?.closest?.('[data-mission-create]')) {
      try {
        const title = titleInput?.value?.trim() || `Mission · ${uiPhase}`;
        const response = await fetch('/api/missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, phase: uiPhase }),
        });
        if (response.ok) {
          const payload = unwrap(await response.json());
          selectedId = payload.mission?.id ?? null;
          await refresh();
        }
      } catch {
        /* ignore */
      }
      return;
    }
    if (!selectedId) return;
    if (event.target?.closest?.('[data-mission-save-aoi]')) {
      try {
        const geometry = JSON.parse(aoiInput?.value || '{}');
        await fetch(`/api/missions/${selectedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aois: [{ type: 'Feature', properties: {}, geometry }],
          }),
        });
        await refresh();
      } catch {
        /* invalid json */
      }
      return;
    }
    if (event.target?.closest?.('[data-mission-search]')) {
      const phase = host.querySelector('[data-mission-search-phase]')?.value || '';
      const q = phase ? `?phase=${encodeURIComponent(phase)}` : '';
      const response = await fetch(`/api/missions/search${q}`, { cache: 'no-store' });
      if (response.ok) {
        const payload = unwrap(await response.json());
        renderList(payload.missions || []);
      }
      return;
    }
    if (event.target?.closest?.('[data-mission-export]')) {
      const response = await fetch(
        `/api/missions/${selectedId}/evidence/export`,
        { cache: 'no-store' },
      );
      if (response.ok) {
        const payload = unwrap(await response.json());
        const blob = new Blob([JSON.stringify(payload.export, null, 2)], {
          type: 'application/json',
        });
        const a = documentRef.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mission-${selectedId.slice(0, 8)}-evidence.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      return;
    }
    if (event.target?.closest?.('[data-mission-go-live]')) {
      await fetch(`/api/missions/${selectedId}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'live' }),
      });
      writeActiveMissionId(selectedId);
      await dataManager?.setEnabled?.('uas-live', true, { origin: 'user' });
      await refresh();
      return;
    }
    if (event.target?.closest?.('[data-mission-go-review]')) {
      await fetch(`/api/missions/${selectedId}/phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'review' }),
      });
      await refresh();
      return;
    }
    if (event.target?.closest?.('[data-mission-add-evidence]')) {
      const note = host.querySelector('[data-mission-evidence]')?.value || '';
      const aisMatch = note.match(/MMSI\s*(\d+)/i);
      await fetch(`/api/missions/${selectedId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'analyst_note',
          note,
          aisMmsi: aisMatch?.[1] ?? null,
        }),
      });
      await refresh();
      return;
    }
    if (event.target?.closest?.('[data-mission-replay-fetch]')) {
      const at = replayAt?.value?.trim();
      if (!at) return;
      const response = await fetch(
        `/api/missions/${selectedId}/telemetry?at=${encodeURIComponent(at)}`,
        { cache: 'no-store' },
      );
      if (response.ok) {
        const payload = unwrap(await response.json());
        if (replayOut)
          replayOut.textContent = JSON.stringify(payload.samples ?? [], null, 2);
      }
    }
  });

  replaySlider?.addEventListener('input', () => {
    if (!replayAt) return;
    const mission = missionsCache.find((m) => m.id === selectedId);
    if (!mission?.startedAt || !mission?.endedAt) return;
    const start = Date.parse(mission.startedAt);
    const end = Date.parse(mission.endedAt);
    const t = start + ((end - start) * Number(replaySlider.value)) / 100;
    replayAt.value = new Date(t).toISOString();
  });

  void refresh();

  return {
    destroy() {
      host.remove();
    },
  };
}
