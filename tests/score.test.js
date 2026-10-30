import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartbeatBpm, isMuted } from '../src/score.js';

test('sound starts muted and the heartbeat follows blood', () => {
  assert.equal(isMuted(), true);
  assert.equal(heartbeatBpm(20), 0);
  assert.equal(heartbeatBpm(13), 0);
  assert.equal(heartbeatBpm(12), 72);
  assert.equal(heartbeatBpm(6) > heartbeatBpm(12), true);
  assert.equal(heartbeatBpm(2) > heartbeatBpm(6), true);
  assert.equal(heartbeatBpm(0), 0);
  assert.equal(heartbeatBpm(1) <= 110, true);
});
