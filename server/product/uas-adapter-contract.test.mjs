import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateRegisterAsset,
  validateTelemetryBatch,
  validateMissionPhase,
} from './uas-adapter-contract.js';

test('validateRegisterAsset accepts minimal asset', () => {
  const result = validateRegisterAsset({ assetId: 'dji-1' });
  assert.equal(typeof result, 'object');
  assert.equal(result.assetId, 'dji-1');
});

test('validateTelemetryBatch normalizes samples', () => {
  const result = validateTelemetryBatch({
    assetId: 'dji-1',
    samples: [{ lat: 1, lon: 2, t: '2026-01-01T00:00:00.000Z' }],
  });
  assert.equal(typeof result, 'object');
  assert.equal(result.samples.length, 1);
});

test('validateMissionPhase rejects unknown', () => {
  assert.equal(validateMissionPhase('live'), 'live');
  assert.equal(validateMissionPhase('nope'), null);
});
