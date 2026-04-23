/**
 * POST /auth/verify-email
 *
 * Consumes the single-use verification token we emailed to the user at
 * signup (or on /auth/resend-verification). On success, flips the user's
 * `emailVerified` flag to true and clears the token fields.
 *
 * Token handling:
 *   - The DB only holds `sha256(token)` so a DB dump cannot be replayed.
 *   - Expired tokens (24h) are rejected; caller is told to request a new
 *     one via /auth/resend-verification.
 *   - On success the row's token fields are cleared so the link stops
 *     working.
 *
 * We do not require the user to be logged in — a fresh signup email can
 * be clicked from any device.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { createHash } from 'crypto'
import { z } from 'zod'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { updateItem, scanTablePage } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import { successResponse } from '../../src/utils/response'

const VerifyEmailSchema = z.object({
  token: z.string().min(16).max(256),
})

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:verify-email',
    identity: rateLimitIdentity(event),
    max: 20,
    windowSec: 60,
  })

  const { token } = parseBody(event, VerifyEmailSchema)
  const tokenHash = hashToken(token)

  // Look up by the token hash. We don't have a GSI on this column (it's a
  // one-shot operation), so a bounded Scan with a FilterExpression is
  // acceptable — the rate limit above keeps the Scan cost negligible.
  const { items } = await scanTablePage({
    tableName: env.USERS_TABLE,
    filterExpression: 'emailVerifyTokenHash = :h',
    expressionAttributeValues: { ':h': tokenHash },
    limit: 1,
  })

  if (items.length === 0) {
    throw new AuthError('Verification link is invalid')
  }

  const user = items[0]
  const expiry = user.emailVerifyTokenExpiry
    ? new Date(user.emailVerifyTokenExpiry).getTime()
    : 0

  if (!expiry || expiry < Date.now()) {
    throw new AuthError('Verification link has expired — request a new one')
  }

  if (user.emailVerified === true) {
    // Already done — idempotent success.
    return successResponse(
      { success: true, alreadyVerified: true },
      200,
      { requestOrigin: ctx.requestOrigin },
    )
  }

  const now = new Date().toISOString()
  await updateItem(
    env.USERS_TABLE,
    { userId: user.userId },
    'SET emailVerified = :t, emailVerifiedAt = :now, updatedAt = :now REMOVE emailVerifyTokenHash, emailVerifyTokenExpiry',
    { ':t': true, ':now': now },
  )

  return successResponse(
    { success: true, alreadyVerified: false },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
