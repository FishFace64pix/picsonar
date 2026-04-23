/**
 * POST /auth/resend-verification
 *
 * Issues a fresh email-verification token for the authenticated user
 * (typical flow: they accidentally deleted the email). The new token
 * invalidates any previous one. Heavily rate-limited to block abuse of
 * our SMTP quota.
 *
 * We respond identically for "already verified" and "sent" states so
 * attackers can't enumerate which accounts are still pending.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { createHash, randomBytes } from 'crypto'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { getItem, updateItem } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { sendVerifyEmailEmail } from '../../src/utils/email'
import { logger } from '../../src/utils/logger'
import { successResponse } from '../../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  const payload = verifyAuthHeader(event.headers.Authorization || event.headers.authorization)
  if (!payload) throw new AuthError('Authentication required')

  // Per-user + per-IP rate limit: 3 emails / 10 min.
  await enforceRateLimit({
    endpoint: 'auth:resend-verification',
    identity: `${payload.userId}:${rateLimitIdentity(event)}`,
    max: 3,
    windowSec: 600,
  })

  const user = await getItem(env.USERS_TABLE, { userId: payload.userId })
  if (!user) throw new AuthError('Account not found')

  // Already verified: return generic success, don't send an email.
  if (user.emailVerified === true) {
    return successResponse(
      { success: true },
      200,
      { requestOrigin: ctx.requestOrigin },
    )
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await updateItem(
    env.USERS_TABLE,
    { userId: user.userId },
    'SET emailVerifyTokenHash = :h, emailVerifyTokenExpiry = :exp, updatedAt = :now',
    { ':h': tokenHash, ':exp': expiry, ':now': new Date().toISOString() },
  )

  try {
    await sendVerifyEmailEmail(user.email, token)
  } catch (err) {
    logger.warn('auth.resend_verification.send_failed', {
      userId: user.userId,
      err: (err as Error).message,
    })
    // Still return success to the client so we don't leak SMTP outages.
  }

  return successResponse(
    { success: true },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
