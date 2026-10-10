/** Layer-state serialization registry for OS Atlas (share links + local restore). */
export const OS_ATLAS_LAYER_STATE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'ais-live-vessels',
    token: 'a',
    disposition: 'enabled-only',
  }),
  Object.freeze({
    id: 'tenant-cctv',
    token: '3',
    disposition: 'enabled-only',
  }),
  Object.freeze({ id: 'earthquakes', token: 'e', disposition: 'enabled-only' }),
  Object.freeze({
    id: 'fire-perimeters',
    token: '2',
    disposition: 'enabled-only',
  }),
  Object.freeze({ id: 'local-firms', token: 'w', disposition: 'enabled-only' }),
  Object.freeze({
    id: 'morocco-site-pack',
    token: '0',
    disposition: 'enabled-only',
  }),
  Object.freeze({
    id: 'satellite-tasking',
    token: '4',
    disposition: 'enabled-only',
  }),
  Object.freeze({
    id: 'uas-live',
    token: '5',
    disposition: 'enabled-only',
  }),
  Object.freeze({
    id: 'weather-cyclones',
    token: 'y',
    disposition: 'enabled-only',
  }),
  Object.freeze({
    id: 'weather-lightning',
    token: 'l',
    disposition: 'enabled+options',
    optionOwner: 'weather-lightning',
  }),
  Object.freeze({
    id: 'weather-radar',
    token: 'v',
    disposition: 'enabled+options',
    optionOwner: 'weather-radar',
  }),
  Object.freeze({
    id: 'weather-satellite',
    token: 'o',
    disposition: 'enabled+options',
    optionOwner: 'weather-satellite',
  }),
  Object.freeze({
    id: 'wind',
    token: 'k',
    disposition: 'enabled+options',
    optionOwner: 'wind',
  }),
]);

export const OS_ATLAS_LOCAL_ONLY_LAYER_METADATA = Object.freeze([
  Object.freeze({ id: 'local-adsb', disposition: 'local-only' }),
]);

export const OS_ATLAS_LAYER_METADATA = Object.freeze([
  ...OS_ATLAS_LAYER_STATE_REGISTRY,
  ...OS_ATLAS_LOCAL_ONLY_LAYER_METADATA,
]);

export const OS_ATLAS_LAYER_IDS = Object.freeze(
  OS_ATLAS_LAYER_METADATA.map((entry) => entry.id),
);
