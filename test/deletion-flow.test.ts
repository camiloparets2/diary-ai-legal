import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDeletionAccepted,
  deletionChallengeMaxAgeMs,
  normalizeEmail,
  readDeletionChallenge,
  serializeDeletionChallenge,
  validateOtpCode,
} from '../src/deletion-flow.ts';

test('deletion OTP challenges are email-bound, short-lived, and clock-safe', () => {
  const now = Date.parse('2026-07-15T12:00:00.000Z');
  const serialized = serializeDeletionChallenge('user-a', ' Owner@Example.com ', now);
  assert.equal(normalizeEmail(' Owner@Example.com '), 'owner@example.com');
  assert.deepEqual(readDeletionChallenge(serialized, 'OWNER@example.com', now + deletionChallengeMaxAgeMs), {
    userId: 'user-a', email: 'owner@example.com', createdAt: now,
  });
  assert.throws(() => readDeletionChallenge(serialized, 'other@example.com', now), /expired/);
  assert.throws(() => readDeletionChallenge(serialized, 'owner@example.com', now + deletionChallengeMaxAgeMs + 1), /expired/);
  assert.throws(() => readDeletionChallenge('{"userId":"user-a","email":"owner@example.com"}', 'owner@example.com', now), /expired/);
  assert.throws(() => readDeletionChallenge(serializeDeletionChallenge('user-a', 'owner@example.com', now + 60_001), 'owner@example.com', now), /expired/);
});

test('deletion confirmation accepts only a six-digit OTP and HTTP 202 acknowledgement', () => {
  assert.equal(validateOtpCode('012345'), '012345');
  for (const value of ['12345', '1234567', '12345a', ' 123456 ']) assert.throws(() => validateOtpCode(value), /six-digit/);
  assert.doesNotThrow(() => assertDeletionAccepted(202, '{"accepted":true}'));
  assert.throws(() => assertDeletionAccepted(200, '{"accepted":true}'), /not accepted/);
  assert.throws(() => assertDeletionAccepted(202, 'not-json'), /not accepted/);
  assert.throws(() => assertDeletionAccepted(401, '{"error":"Sign in again."}'), /Sign in again/);
});
