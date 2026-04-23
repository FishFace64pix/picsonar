/**
 * POST /auth/forgot-password
 *
 * Triggers the password-reset email flow.
 * Always returns a 200 with the same message regardless of whether the email
 * exists — prevents account enumeration.
 * Rate-limited per-IP to blunt enumeration via timing/volume.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import * as crypto from 'crypto'

import { ForgotPasswordSchema } from '@picsonar/shared/schemas'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { queryItems, updateItem } from '../../src/utils/dynamodb'
import { sendResetPasswordEmail } from '../../src/utils/email'
import { successResponse } from '../../src/utils/response'

const GENERIC_OK = {
  message: 'If an account exists for that email, a reset link has been sent.',
}

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:forgot-password',
    identity: rateLimitIdentity(event),
    max: 5,
    windowSec: 60,
  })

  const input = parseBody(event, ForgotPasswordSchema)

  const users = await queryItems(
    env.USERS_TABLE,
    'email = :email',
    { ':email': input.email.toLowerCase() },
    'email-index',
  )

  if (users.length === 0) {
    return successResponse(GENERIC_OK, 200, { requestOrigin: ctx.requestOrigin })
  }

  const user = users[0]
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenExpiry = Date.now() + 60 * 60 * 1000 // 1h

  await updateItem(
    env.USERS_TABLE,
    { userId: user.userId },
    'SET resetToken = :token, resetTokenExpiry = :expiry',
    { ':token': resetToken, ':expiry': resetTokenExpiry },
  )

  try {
    await sendResetPasswordEmail(user.email, resetToken)
  } catch (mailErr) {
    // Don't reveal send failure to the caller (avoids enumeration) — log it.
    console.error('[forgotPassword] email send failed', {
      traceId: ctx.traceId,
      mailErr,
    })
    if (env.NODE_ENV !== 'production') {
      return successResponse(
        { ...GENERIC_OK, _devToken: resetToken },
        200,
        { requestOrigin: ctx.requestOrigin },
      )
    }
  }

  return successResponse(GENERIC_OK, 200, { requestOrigin: ctx.requestOrigin })
})
