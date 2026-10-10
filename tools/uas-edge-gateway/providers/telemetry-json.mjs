import fs from 'node:fs';

/** Tail a JSONL file of telemetry samples (manual / companion script field fallback). */
export function createTelemetryJsonProvider({ filePath, onSample }) {
  let offset = 0;
  return {
    start(intervalMs = 1000) {
      return setInterval(() => {
        if (!filePath || !fs.existsSync(filePath)) return;
        const stat = fs.statSync(filePath);
        if (stat.size < offset) offset = 0;
        if (stat.size === offset) return;
        const chunk = fs.readFileSync(filePath, 'utf8').slice(offset);
        offset = stat.size;
        const lines = chunk.trim().split('\n');
        const last = lines.at(-1);
        if (!last) return;
        try {
          const sample = JSON.parse(last);
          onSample({
            t: sample.t || new Date().toISOString(),
            lat: sample.lat,
            lon: sample.lon,
            altM: sample.altM,
            headingDeg: sample.headingDeg,
            groundSpeedMps: sample.groundSpeedMps,
            mode: sample.mode || 'json',
          });
        } catch {
          /* ignore */
        }
      }, intervalMs);
    },
  };
}
