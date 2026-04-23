/**
 * POST /auth/reset-password
 *
 * - Validates body against ResetPasswordSchema (token + new password complexity)
 * - Looks up user via resetToken-index
 * - Expiry check
 * - Re-hashes with bcrypt + clears token atomically (ConditionExpression
 *   prevents a race where another reset succeeded first)
 * - IP-based rate limit
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'

import { ResetPasswordSchema } from '@picsonar/shared/schemas'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { queryItems, updateItem } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import { hashPassword } from '../../src/utils/password'
import { successResponse } from '../../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:reset-password',
    identity: rateLimitIdentity(event),
    max: 5,
    windowSec: 60,
  })

  const input = parseBody(event, ResetPasswordSchema)

  const users = await queryItems(
    env.USERS_TABLE,
    'resetToken = :token',
    { ':token': input.token },
    'resetToken-index',
  )
  if (users.length === 0) {
    throw new AuthError('Invalid or expired reset token')
  }

  const user = users[0]
  const now = Date.now()
  if (!user.resetTokenExpiry || Number(user.resetTokenExpiry) < now) {
    throw new AuthError('Invalid or expired reset token')
  }

  const newHash = await hashPassword(input.newPassword)

  await updateItem(
    env.USERS_TABLE,
    { userId: user.userId },
    'SET #pw = :pw REMOVE resetToken, resetTokenExpiry',
    { ':pw': newHash, ':token': input.token },
    { '#pw': 'password' },
    'resetToken = :token',
  )

  return successResponse(
    { message: 'Password has been reset successfully' },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
