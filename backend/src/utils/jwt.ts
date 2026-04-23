import jwt from 'jsonwebtoken'
import { randomUUID, createHash } from 'crypto'
import type { JwtPayload, UserRole } from '@picsonar/shared/types'
import { getEnv } from '../config/env'

export type { JwtPayload } from '@picsonar/shared/types'

// 15-min access + 30-day refresh: short access window shrinks the blast
// radius of a stolen token; refresh endpoint rotates it silently via the
// axios interceptor. Change requires coordinated frontend testing.
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '30d'

function secret(): string {
  return getEnv().JWT_SECRET
}

function refreshSecret(): string {
  return getEnv().JWT_REFRESH_SECRET ?? getEnv().JWT_SECRET
}

/** Sign a short-lived access token. */
export function signAccessToken(userId: string, role: UserRole = 'user'): string {
  return jwt.sign({ userId, role }, secret(), {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: 'picsonar',
    audience: 'picsonar-app',
  })
}

/**
 * Sign a long-lived refresh token.
 *
 * Every refresh token gets a `jti` (JWT ID) — a uuid we can reference in the
 * `RevokedTokens` DynamoDB table to kill a single session without nuking the
 * global signing secret. The jti is what gets hashed + stored on logout.
 */
export function signRefreshToken(userId: string, role: UserRole = 'user'): string {
  return jwt.sign({ userId, role, type: 'refresh' }, refreshSecret(), {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: 'picsonar',
    audience: 'picsonar-app',
    jwtid: randomUUID(),
  })
}

/** @deprecated Use signAccessToken. Kept for backward compat during migration. */
export function signToken(userId: string, role: string = 'user'): string {
  return signAccessToken(userId, (role as UserRole) ?? 'user')
}

/**
 * Verifies a JWT. Returns the payload or null.
 * No silent fallback — invalid / expired / tampered all return null.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, secret(), {
      algorithms: ['HS256'],
      issuer: 'picsonar',
      audience: 'picsonar-app',
    }) as JwtPayload
    return payload
  } catch {
    return null
  }
}

export interface RefreshPayload extends JwtPayload {
  userId: string
  role: UserRole
  type: 'refresh'
  jti: string
  exp: number
}

/**
 * Verify a refresh token's shape and signature — **does not** check the
 * revocation list. Callers that need full revocation check should wrap this
 * with `isRefreshTokenRevoked` from `tokenRevocation.ts`.
 */
export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const payload = jwt.verify(token, refreshSecret(), {
      algorithms: ['HS256'],
      issuer: 'picsonar',
      audience: 'picsonar-app',
    }) as JwtPayload & { type?: string; jti?: string; exp?: number }
    if (payload.type !== 'refresh') return null
    if (!payload.jti || !payload.exp) return null
    return payload as RefreshPayload
  } catch {
    return null
  }
}

/**
 * Extract and verify JWT from an Authorization header.
 * Accepts `Bearer <token>` and tolerates case variations.
 */
export function verifyAuthHeader(authHeader: string | undefined): JwtPayload | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  return verifyToken(token)
}

/**
 * Hash a `jti` (JWT ID) for use as a DynamoDB partition key in the revoked
 * tokens table. Hashing (rather than storing the raw jti) is defence in
 * depth — even if the revocation table is exfiltrated, you can't correlate
 * entries back to active tokens.
 */
export function hashJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex')
}
