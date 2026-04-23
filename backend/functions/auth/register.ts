/**
 * POST /auth/register
 *
 * - Validates body against RegisterSchema (email, password complexity, RO phone, legal consent)
 * - Hashes password with bcrypt (cost 12) — NEVER stores plain or SHA-256
 * - Signs JWT (HS256, 1h access) via signAccessToken
 * - Enforces geo-restriction + uniqueness
 * - Rate-limited per IP to mitigate signup abuse
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes, createHash } from 'crypto'

import { RegisterSchema } from '@picsonar/shared/schemas'
import type { User } from '@picsonar/shared/types'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { putItem, queryItems } from '../../src/utils/dynamodb'
import { ConflictError, ForbiddenError } from '../../src/utils/errors'
import { hashPassword } from '../../src/utils/password'
import { signAccessToken, signRefreshToken } from '../../src/utils/jwt'
import { successResponse } from '../../src/utils/response'
import { isFromRomania } from '../../src/utils/geoRestriction'
import { sendVerifyEmailEmail } from '../../src/utils/email'
import { logger } from '../../src/utils/logger'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:register',
    identity: rateLimitIdentity(event),
    max: 5,
    windowSec: 60,
  })

  const input = parseBody(event, RegisterSchema)

  // Geo-restriction: Romania-only signup (regulatory)
  if (!isFromRomania(event)) {
    throw new ForbiddenError('Registration is currently restricted to Romania')
  }

  const existing = await queryItems(
    env.USERS_TABLE,
    'email = :email',
    { ':email': input.email.toLowerCase() },
    'email-index',
  )
  if (existing.length > 0) {
    throw new ConflictError('An account already exists for this email')
  }

  const now = new Date().toISOString()
  const ip = event.requestContext?.identity?.sourceIp ?? 'unknown'
  const userAgent =
    event.headers?.['User-Agent'] ?? event.headers?.['user-agent'] ?? 'unknown'

  const userId = uuidv4()
  const passwordHash = await hashPassword(input.password)

  // Email-verification token. We store only the sha256 so the raw token
  // only ever lives in the email we just sent. 24-hour expiry.
  const emailVerifyToken = randomBytes(32).toString('hex')
  const emailVerifyTokenHash = createHash('sha256')
    .update(emailVerifyToken)
    .digest('hex')
  const emailVerifyTokenExpiry = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString()

  const newUser: User & {
    password: string
    legalAudit: Record<string, string>
    acceptedTermsAt: string | null
    acceptedPrivacyAt: string | null
    acceptedDpaAt: string | null
    /**
     * Timestamp when the user waived the 14-day cooling-off right by
     * consenting to immediate delivery. Required for any ANPC dispute
     * where the user retroactively claims they should have had the 14
     * days — we produce this row + the IP + UA as proof.
     */
    acceptedImmediateDeliveryAt: string | null
  } = {
    userId,
    email: input.email.toLowerCase(),
    name: input.name,
    phone: input.phone,
    role: 'user',
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
    acceptedTermsAt: input.legal.termsAccepted ? now : null,
    acceptedPrivacyAt: input.legal.privacyAccepted ? now : null,
    acceptedDpaAt: input.legal.dpaAccepted ? now : null,
    acceptedImmediateDeliveryAt: input.legal.immediateDeliveryConsent
      ? now
      : null,
    legalAudit: {
      ip,
      userAgent,
      termsVersion: '1.0',
      privacyVersion: '1.0',
      dpaVersion: '1.0',
      immediateDeliveryVersion: '1.0',
    },
    plan: 'starter',
    eventCredits: 0,
    subscriptionStatus: 'inactive',
    emailVerified: false,
    emailVerifyTokenHash,
    emailVerifyTokenExpiry,
  } as any

  await putItem(env.USERS_TABLE, newUser, 'attribute_not_exists(userId)')

  // Best-effort: sending the email should never block registration. If the
  // SMTP provider is down we still create the account — the user can always
  // hit /auth/resend-verification later.
  try {
    await sendVerifyEmailEmail(newUser.email, emailVerifyToken)
  } catch (err) {
    logger.warn('auth.register.verify_email_send_failed', {
      userId,
      err: (err as Error).message,
    })
  }

  const accessToken = signAccessToken(userId, 'user')
  const refreshToken = signRefreshToken(userId)

  // Strip password before returning
  const { password: _pw, ...userWithoutPassword } = newUser

  return successResponse(
    { token: accessToken, refreshToken, user: userWithoutPassword },
    201,
    { requestOrigin: ctx.requestOrigin },
  )
})
