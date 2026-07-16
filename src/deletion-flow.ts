export type DeletionChallenge = { userId: string; email: string; createdAt: number };

export const deletionChallengeMaxAgeMs = 15 * 60_000;
const maximumFutureClockSkewMs = 60_000;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function serializeDeletionChallenge(userId: string, email: string, now = Date.now()): string {
  const normalized = normalizeEmail(email);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(userId) || !normalized) {
    throw new Error('The verification request could not be saved.');
  }
  return JSON.stringify({ userId, email: normalized, createdAt: now } satisfies DeletionChallenge);
}

export function readDeletionChallenge(raw: string | null, email: string, now = Date.now()): DeletionChallenge {
  let value: unknown;
  try { value = raw ? JSON.parse(raw) : null; } catch { value = null; }
  if (!value || typeof value !== 'object') throw new Error('The verification request expired. Reload this page and request a new code.');
  const challenge = value as Partial<DeletionChallenge>;
  const validUserId = typeof challenge.userId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(challenge.userId);
  const validEmail = typeof challenge.email === 'string' && normalizeEmail(challenge.email) === normalizeEmail(email);
  const validTimestamp = Number.isSafeInteger(challenge.createdAt)
    && Number(challenge.createdAt) <= now + maximumFutureClockSkewMs
    && now - Number(challenge.createdAt) <= deletionChallengeMaxAgeMs;
  if (!validUserId || !validEmail || !validTimestamp) {
    throw new Error('The verification request expired. Reload this page and request a new code.');
  }
  return challenge as DeletionChallenge;
}

export function validateOtpCode(value: string): string {
  if (!/^\d{6}$/.test(value)) throw new Error('Enter the six-digit code from your email.');
  return value;
}

export function assertDeletionAccepted(status: number, responseBody: string): void {
  let response: { accepted?: boolean; error?: string } = {};
  try { response = responseBody ? JSON.parse(responseBody) as typeof response : {}; } catch { /* handled below */ }
  if (status !== 202 || response.accepted !== true) {
    throw new Error(typeof response.error === 'string' && response.error ? response.error : 'The deletion request was not accepted.');
  }
}
