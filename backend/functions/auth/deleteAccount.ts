/**
 * POST /auth/delete-account  (GDPR Art. 17 — right to erasure)
 *
 * Soft-delete today, hard-purge in 30 days.
 *
 * Why two phases:
 *   - Romanian fiscal law requires 5-year invoice retention (Codul Fiscal
 *     art. 25(4)(d)). Invoices are bound to the user via userId, so we
 *     can't wipe the user row immediately without orphaning the ledger.
 *   - The 30-day grace window is standard industry practice (matches
 *     Stripe / Google / GitHub) and gives the user a chance to reverse
 *     their decision.
 *
 * What this endpoint does synchronously:
 *   1. Re-verifies the caller's password (sensitive action).
 *   2. Flips the user row to `deleted: true` + `disabled: true` so all
 *      subsequent auth attempts fail immediately.
 *   3. Revokes any pending refresh tokens the caller has mentioned.
 *   4. Queues the hard-purge for T+30 days via a `purgeAt` timestamp.
 *      A separate scheduled Lambda (or CRON job) scans for expired
 *      `purgeAt` rows and runs the cascading delete — out of scope for
 *      this endpoint.
 *
 * What gets purged at T+30 (described for future scheduled job):
 *   - All events owned by the user + their photos from S3
 *   - All face-index entries for those events from the Rekognition
 *     collection (via DeleteFacesCommand)
 *   - The user row itself (fiscal invoices keep a synthetic `userId` reference
 *     that resolves to "deleted user" in the admin UI — the accountant
 *     still has the CUI / company name from the invoice snapshot).
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { getItem, updateItem } from '../../src/utils/dynamodb'
import { AuthError, ForbiddenError } from '../../src/utils/errors'
import { verifyAuthHeader, verifyRefreshToken } from '../../src/utils/jwt'
import { verifyPassword } from '../../src/utils/password'
import { revokeRefreshToken } from '../../src/utils/tokenRevocation'
import { successResponse } from '../../src/utils/response'
import { logger, emitMetric } from '../../src/utils/logger'

const DeleteAccountSchema = z.object({
  /** Current password — proves the caller actually owns the account. */
  password: z.string().min(1),
  /** Optional refresh token to revoke alongside deletion. */
  refreshToken: z.string().optional(),
  /** Free-text reason (logged, not displayed). GDPR doesn't require it. */
  reason: z.string().max(2000).optional(),
})

const GRACE_DAYS = 30

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  const jwt = verifyAuthHeader(
    event.headers.Authorization || event.headers.authorization,
  )
  if (!jwt) throw new AuthError('Authentication required')

  await enforceRateLimit({
    endpoint: 'auth:delete-account',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 3,
    windowSec: 3600,
  })

  const input = parseBody(event, DeleteAccountSchema)

  const user = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!user || user.deleted === true) {
    throw new AuthError('Account not found')
  }
  if (!user.password) {
    throw new ForbiddenError(
      'Deletion requires a password. Please reset your password first.',
    )
  }

  const ok = await verifyPassword(input.password, user.password)
  if (!ok) {
    throw new AuthError('Password is incorrect')
  }

  const now = new Date()
  const purgeAt = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
  const purgeAtSeconds = Math.floor(purgeAt.getTime() / 1000)

  await updateItem(
    env.USERS_TABLE,
    { userId: user.userId },
    'SET deleted = :t, disabled = :t, deletedAt = :now, purgeAt = :purgeAt, updatedAt = :now, deletionReason = :reason',
    {
      ':t': true,
      ':now': now.toISOString(),
      ':purgeAt': purgeAtSeconds,
      ':reason': input.reason ?? 'not_provided',
    },
  )

  // Revoke the refresh token if the caller passed one — the user's
  // current session dies immediately.
  if (input.refreshToken) {
    const refreshPayload = verifyRefreshToken(input.refreshToken)
    if (refreshPayload) {
      await revokeRefreshToken({
        jti: refreshPayload.jti,
        exp: refreshPayload.exp,
        reason: 'admin_revoke',
        userId: user.userId,
      })
    }
  }

  logger.info('auth.delete_account.soft', {
    userId: user.userId,
    purgeAt: purgeAt.toISOString(),
  })
  emitMetric('AccountDeletionRequested', 1, 'Count')

  return successResponse(
    {
      success: true,
      purgeAt: purgeAt.toISOString(),
      message: `Account scheduled for permanent deletion on ${purgeAt.toISOString().slice(0, 10)}. Sign in again before then to cancel.`,
    },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
