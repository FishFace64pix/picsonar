/**
 * Refresh-token revocation store.
 *
 * A logged-out or rotated refresh token is added here so that subsequent
 * `POST /auth/refresh` attempts using the same jti are rejected even though
 * the signature is still cryptographically valid. Entries TTL-auto-expire at
 * the token's own `exp` time — DynamoDB then scavenges them for free, so the
 * table never grows beyond the current active-session fleet.
 *
 * We key the table by `sha256(jti)` rather than the raw jti, so an attacker
 * who dumps the table still can't correlate rows back to live tokens. The
 * refresh token itself is never stored.
 */
import { getEnv } from '../config/env'
import { getItem, putItem } from './dynamodb'
import { hashJti } from './jwt'
import { logger } from './logger'

interface RevokedTokenRecord {
  /** sha256(jti) — DynamoDB HASH key */
  pk: string
  /** Unix epoch seconds; DynamoDB TTL auto-deletes rows past this time. */
  ttl: number
  /** Reason for revocation — audit breadcrumb, not used for logic. */
  reason: 'logout' | 'rotation' | 'password_change' | 'admin_revoke'
  /** When the revocation happened, ISO string. */
  revokedAt: string
  /** User id for audit; optional if we only have a jti. */
  userId?: string
}

function tableName(): string {
  const env = getEnv()
  if (!env.REVOKED_TOKENS_TABLE) {
    // Fail loud — running without this table in prod is a silent auth bypass.
    throw new Error(
      'REVOKED_TOKENS_TABLE is not configured; refresh token revocation is unavailable',
    )
  }
  return env.REVOKED_TOKENS_TABLE
}

export async function revokeRefreshToken(params: {
  jti: string
  exp: number
  reason: RevokedTokenRecord['reason']
  userId?: string
}): Promise<void> {
  const record: RevokedTokenRecord = {
    pk: hashJti(params.jti),
    ttl: params.exp,
    reason: params.reason,
    revokedAt: new Date().toISOString(),
    userId: params.userId,
  }
  await putItem(tableName(), record)
  logger.info('auth.refresh.revoked', {
    reason: params.reason,
    userId: params.userId,
  })
}

export async function isRefreshTokenRevoked(jti: string): Promise<boolean> {
  const existing = await getItem(tableName(), { pk: hashJti(jti) })
  return Boolean(existing)
}
