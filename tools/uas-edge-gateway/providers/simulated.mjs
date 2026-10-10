/** Synthetic orbit for bench testing without a drone. */
export function createSimulatedTelemetryProvider({ lat0, lon0, onSample }) {
  let angle = 0;
  return {
    start(intervalMs = 1000) {
      return setInterval(() => {
        angle += 0.03;
        const lat = lat0 + Math.sin(angle) * 0.002;
        const lon = lon0 + Math.cos(angle) * 0.002;
        onSample({
          t: new Date().toISOString(),
          lat,
          lon,
          altM: 95,
          headingDeg: (angle * 180) / Math.PI,
          groundSpeedMps: 6,
          mode: 'sim',
        });
      }, intervalMs);
    },
  };
}
