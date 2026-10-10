import { makeOptInRateLimiter } from './common/rate-limit.js';
import { enforceOptInRateLimit } from './openai/rate-limit.js';

let _uasTelemetryLimiter;

function uasTelemetryRateLimiter() {
  if (_uasTelemetryLimiter === undefined) {
    _uasTelemetryLimiter = makeOptInRateLimiter(
      process.env.OS_ATLAS_UAS_TELEMETRY_PER_MIN,
    );
  }
  return _uasTelemetryLimiter;
}

export function enforceUasTelemetryRateLimit(req, res) {
  return enforceOptInRateLimit(uasTelemetryRateLimiter(), req, res);
}
