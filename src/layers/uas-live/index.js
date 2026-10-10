import * as Cesium from 'cesium';
import { createUasVideoPanel } from './videoPanel.js';

const LAYER_ID = 'uas-live';
const ENTITY_PREFIX = 'uas-live:';
const TRAIL_PREFIX = 'uas-trail:';
const COLOR = Cesium.Color.CYAN.withAlpha(0.9);

export function createUasLiveLayer({ source, videoPanel: injectedPanel } = {}) {
  if (typeof source?.getSnapshot !== 'function')
    throw new TypeError('UAS live layer requires a snapshot source');
  const videoPanel = injectedPanel ?? createUasVideoPanel();
  let _viewer = null;
  let _dataSource = null;
  let _enabled = false;
  let _request = null;
  let _count = 0;
  let _stale = true;
  let _lastError = null;
  let _selectedId = null;
  let _lastSnapshot = [];

  const layer = {
    id: LAYER_ID,
    name: 'UAS live',
    icon: '🛸',
    source: 'Vehicle Adapter',
    updateInterval: 1000,

    init(viewer) {
      if (_viewer) throw new Error('UAS layer already initialized');
      _viewer = viewer;
      _dataSource = new Cesium.CustomDataSource(LAYER_ID);
      _dataSource.show = false;
      viewer.dataSources.add(_dataSource);
    },

    enable() {
      _enabled = true;
      if (_dataSource) _dataSource.show = true;
    },

    disable() {
      _request?.abort();
      _request = null;
      _enabled = false;
      if (_dataSource) _dataSource.show = false;
      videoPanel.hide();
    },

    destroy() {
      this.disable();
      if (_dataSource && _viewer) _viewer.dataSources.remove(_dataSource);
      _dataSource = null;
      _viewer = null;
      videoPanel.destroy();
    },

    async update() {
      if (!_enabled || !_dataSource) return false;
      _request?.abort();
      const request = new AbortController();
      _request = request;
      try {
        const snapshot = await source.getSnapshot({ signal: request.signal });
        if (request.signal.aborted || _request !== request) return false;
        const aircraft = snapshot?.aircraft ?? [];
        _lastSnapshot = aircraft;
        _count = aircraft.length;
        _stale = snapshot?.stale === true || aircraft.every((a) => a.stale);
        _lastError = null;
        const keep = new Set();
        for (const ac of aircraft) {
          const id = `${ENTITY_PREFIX}${ac.id}`;
          keep.add(id);
          let entity = _dataSource.entities.getById(id);
          const position = Cesium.Cartesian3.fromDegrees(
            ac.lon,
            ac.lat,
            ac.altM ?? 80,
          );
          if (!entity) {
            entity = _dataSource.entities.add({
              id,
              position,
              point: {
                pixelSize: 12,
                color: ac.stale ? Cesium.Color.GRAY : COLOR,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
              },
              label: {
                text: ac.label || ac.id,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -14),
                show: true,
              },
              properties: {
                uasId: ac.id,
                stale: ac.stale,
                ageMs: ac.ageMs,
              },
            });
          } else {
            entity.position = position;
            entity.point.color = ac.stale ? Cesium.Color.GRAY : COLOR;
            entity.label.text = `${ac.label || ac.id}${ac.stale ? ' · stale' : ''}`;
          }
          const trailId = `${TRAIL_PREFIX}${ac.id}`;
          keep.add(trailId);
          try {
            const trailRes = await fetch(`/api/uas/trail/${encodeURIComponent(ac.id)}`, {
              cache: 'no-store',
              signal: request.signal,
            });
            if (trailRes.ok) {
              const envelope = await trailRes.json();
              const trail = envelope?.data?.trail ?? envelope?.trail ?? [];
              const positions = trail.map((p) =>
                Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.altM ?? 80),
              );
              if (positions.length >= 2) {
                let trailEntity = _dataSource.entities.getById(trailId);
                if (!trailEntity) {
                  trailEntity = _dataSource.entities.add({
                    id: trailId,
                    polyline: {
                      positions,
                      width: 2,
                      material: COLOR.withAlpha(0.6),
                    },
                  });
                } else {
                  trailEntity.polyline.positions = positions;
                }
              }
            }
          } catch {
            /* trail optional */
          }
          if (_selectedId === ac.id) {
            try {
              const streamRes = await fetch(source.getStreamUrl(ac.id), {
                cache: 'no-store',
                signal: request.signal,
              });
              if (streamRes.ok) {
                const envelope = await streamRes.json();
                const stream = envelope?.data ?? envelope;
                videoPanel.show({
                  assetId: ac.id,
                  label: ac.label,
                  feedType: stream.feedType,
                  mediaUrl: stream.mediaUrl,
                });
              }
            } catch {
              /* video optional */
            }
          }
        }
        for (const entity of _dataSource.entities.values) {
          if (!keep.has(entity.id)) _dataSource.entities.remove(entity);
        }
        return true;
      } catch (error) {
        if (request.signal.aborted) return false;
        _lastError = error;
        return false;
      }
    },

    trackById(id, { origin = 'programmatic' } = {}) {
      void origin;
      _selectedId = id ? String(id).replace(ENTITY_PREFIX, '') : null;
      if (!_selectedId) videoPanel.hide();
      return Boolean(_selectedId);
    },

    getTrackedSubject() {
      if (!_selectedId) return null;
      const ac = _lastSnapshot.find((a) => a.id === _selectedId);
      if (!ac) return null;
      return Object.freeze({
        id: _selectedId,
        layerId: LAYER_ID,
        label: ac.label || _selectedId,
        lat: ac.lat,
        lon: ac.lon,
      });
    },

    getDetectableObjects() {
      return _lastSnapshot.map((ac) =>
        Object.freeze({
          id: ac.id,
          layerId: LAYER_ID,
          label: ac.label || ac.id,
          lat: ac.lat,
          lon: ac.lon,
          stale: ac.stale,
        }),
      );
    },

    getNearby({ lat, lon, radiusM = 5000 } = {}) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      const toRad = Math.PI / 180;
      const r = radiusM / 6371000;
      return this.getDetectableObjects().filter((ac) => {
        const dLat = (ac.lat - lat) * toRad;
        const dLon = (ac.lon - lon) * toRad;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat * toRad) *
            Math.cos(ac.lat * toRad) *
            Math.sin(dLon / 2) ** 2;
        return 2 * 6371000 * Math.asin(Math.sqrt(a)) <= radiusM;
      });
    },

    getAllPositions() {
      return _lastSnapshot.map((ac) =>
        Object.freeze({ id: ac.id, lat: ac.lat, lon: ac.lon, altM: ac.altM }),
      );
    },

    getStats() {
      return {
        enabled: _enabled,
        count: _count,
        stale: _stale,
        error: _lastError ? String(_lastError.message || _lastError) : null,
      };
    },

    getRowControls() {
      const stats = this.getStats();
      const status = stats.error
        ? stats.error
        : stats.count === 0
          ? 'Awaiting edge gateway telemetry'
          : stats.stale
            ? 'All tracks stale — check link'
            : `${stats.count} airborne`;
      return {
        summary: { status },
        info: 'DJI-class and tactical UAS via Vehicle Adapter ingest',
      };
    },

    getAnalystRecords() {
      return [];
    },
  };

  return layer;
}

export { LAYER_ID as UAS_LIVE_LAYER_ID };
