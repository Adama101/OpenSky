/** Minimal layer shell for tenant integrations pending full ingest. */
export function createPlatformStubLayer({
  id,
  name,
  icon = '◇',
  source = 'OS Atlas',
  statusMessage = 'Pending tenant configuration',
}) {
  let _enabled = false;
  return {
    id,
    name,
    icon,
    source,
    showInTogglePanel: true,
    init() {},
    enable() {
      _enabled = true;
    },
    disable() {
      _enabled = false;
    },
    destroy() {
      _enabled = false;
    },
    update() {},
    getStats() {
      return { enabled: _enabled, count: 0 };
    },
    getRowControls() {
      return {
        summary: { status: statusMessage },
        info: statusMessage,
      };
    },
    getAnalystRecords() {
      return [];
    },
  };
}
