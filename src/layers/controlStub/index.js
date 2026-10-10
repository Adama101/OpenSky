/** Inert layer used for legacy control bindings removed from the OS Atlas catalog. */
export function createControlStubLayer(id) {
  const noop = () => {};
  const noopAsync = async () => {};
  return Object.freeze({
    id,
    showInTogglePanel: false,
    init: noop,
    enable: noop,
    disable: noop,
    destroy: noop,
    update: noopAsync,
    stopTracking: noop,
    beginWorldJump: noop,
    endWorldJump: noop,
    releaseCameraOwnership: noop,
    getUIState: () => Object.freeze({ enabled: false, stations: [] }),
    getTrackedInfo: () => null,
    getTrackedSubject: () => null,
    trackById: () => false,
    refocusTrackedById: () => false,
    getNearby: () => [],
    getAllPositions: () => [],
    getDetectableObjects: () => [],
    focusNearest: noop,
    focusCamera: noop,
    getRowControls: () =>
      Object.freeze({ summary: Object.freeze({}), chips: Object.freeze([]) }),
    getAnalystRecords: () => [],
    getParams: () => Object.freeze({}),
    setParams: noop,
  });
}
