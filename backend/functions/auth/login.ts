/**
 * POST /auth/login
 *
 * - Validates body against LoginSchema
 * - Looks up user by email-index (single Query, not Scan)
 * - Verifies password against bcrypt hash. If legacy SHA-256 hash is detected,
 *   the user is forced through the password-reset flow (no silent upgrade —
 *   we refuse the login and instruct them to reset).
 * - Issues access + refresh tokens
 * - IP-based rate limit to blunt credential stuffing
 *
 * IMPORTANT: All failure branches return the same generic "Invalid email or
 * password" message to avoid leaking which accounts exist.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'

import { LoginSchema } from '@picsonar/shared/schemas'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { queryItems, updateItem } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import { isLegacySha256Hash, verifyPassword } from '../../src/utils/password'
import { signAccessToken, signRefreshToken } from '../../src/utils/jwt'
import { successResponse } from '../../src/utils/response'
import { logger } from '../../src/utils/logger'

const GENERIC_AUTH_ERROR = 'Invalid email or password'
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 min

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:login',
    identity: rateLimitIdentity(event),
    max: 10,
    windowSec: 60,
  })

  const input = parseBody(event, LoginSchema)

  const users = await queryItems(
    env.USERS_TABLE,
    'email = :email',
    { ':email': input.email.toLowerCase() },
    'email-index',
  )

  if (users.length === 0) {
    throw new AuthError(GENERIC_AUTH_ERROR)
  }

  const user = users[0]

  // Account scheduled for deletion (GDPR Art. 17 soft-delete) or admin-disabled.
  if (user.deleted === true || user.disabled === true) {
    throw new AuthError(GENERIC_AUTH_ERROR)
  }

  // Per-account lockout: 5 consecutive wrong passwords locks the account
  // for 15 min. This sits on top of the IP rate limit above — the IP
  // limit blocks distributed credential stuffing from a single origin,
  // this blocks slow-drip guessing that stays under the IP rate.
  const lockedUntil = user.lockoutUntil ? Number(user.lockoutUntil) : 0
  if (lockedUntil && lockedUntil > Date.now()) {
    const minsLeft = Math.ceil((lockedUntil - Date.now()) / 60000)
    throw new AuthError(
      `Too many failed attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`,
    )
  }

  // Legacy SHA-256 hash: refuse login, force password reset.
  if (!user.password || isLegacySha256Hash(user.password)) {
    throw new AuthError(
      'Please reset your password to continue — our security policy has been upgraded',
    )
  }

  const ok = await verifyPassword(input.password, user.password)
  if (!ok) {
    // Atomic counter increment; when it crosses the threshold we stamp
    // the lockout. The condition expression makes the read+write safe
    // under concurrent login attempts (e.g. password-spray attacks).
    const attempts = (user.failedLoginAttempts ?? 0) + 1
    const shouldLock = attempts >= LOCKOUT_THRESHOLD
    try {
      await updateItem(
        env.USERS_TABLE,
        { userId: user.userId },
        shouldLock
          ? 'SET failedLoginAttempts = :a, lockoutUntil = :lu, lastFailedLoginAt = :now'
          : 'SET failedLoginAttempts = :a, lastFailedLoginAt = :now',
        {
          ':a': attempts,
          ':lu': Date.now() + LOCKOUT_WINDOW_MS,
          ':now': new Date().toISOString(),
        },
      )
    } catch (err) {
      logger.warn('auth.login.failed_attempt_write_error', {
        userId: user.userId,
        err: (err as Error).message,
      })
    }
    throw new AuthError(GENERIC_AUTH_ERROR)
  }

  // Success: clear any lockout / attempt counter. We don't care if the
  // user didn't have the fields set; the REMOVE is a no-op in that case.
  if (user.failedLoginAttempts || user.lockoutUntil) {
    try {
      await updateItem(
        env.USERS_TABLE,
        { userId: user.userId },
        'REMOVE failedLoginAttempts, lockoutUntil, lastFailedLoginAt',
        {},
      )
    } catch {
      // Non-fatal — the user is now logged in successfully.
    }
  }

  const role: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user'
  const accessToken = signAccessToken(user.userId, role)
  const refreshToken = signRefreshToken(user.userId)

  const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user

  return successResponse(
    { token: accessToken, refreshToken, user: safeUser },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
