/**
 * POST /auth/refresh
 *
 * Exchanges a valid refresh token for a fresh (access, refresh) pair.
 * The old refresh token is revoked (rotation) so that a leaked refresh
 * token can only be used once — if an attacker and the legitimate user
 * both hold the same token, whichever calls `/auth/refresh` first wins,
 * and the other is forced to re-authenticate.
 *
 * Failure cases (all return 401):
 *   - Signature invalid / expired / malformed
 *   - Wrong token type (we only accept type === 'refresh')
 *   - jti already in the RevokedTokens table (logout or prior rotation)
 *
 * We deliberately do NOT accept the refresh token from an Authorization
 * header — that's reserved for access tokens. Clients pass refresh tokens
 * in the body so a bad middleware can't accidentally log them.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getItem } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} from '../../src/utils/jwt'
import {
  isRefreshTokenRevoked,
  revokeRefreshToken,
} from '../../src/utils/tokenRevocation'
import { successResponse } from '../../src/utils/response'

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'auth:refresh',
    identity: rateLimitIdentity(event),
    max: 60,
    windowSec: 60,
  })

  const { refreshToken } = parseBody(event, RefreshSchema)

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    throw new AuthError('Invalid or expired refresh token')
  }

  // One-use refresh tokens: if this jti is already revoked, reject.
  if (await isRefreshTokenRevoked(payload.jti)) {
    throw new AuthError('Refresh token has been revoked')
  }

  // Make sure the user still exists (and isn't admin-disabled).
  const user = await getItem(env.USERS_TABLE, { userId: payload.userId })
  if (!user || user.disabled === true) {
    throw new AuthError('Account is not active')
  }

  // Rotate: burn the old jti, mint a new pair.
  await revokeRefreshToken({
    jti: payload.jti,
    exp: payload.exp,
    reason: 'rotation',
    userId: payload.userId,
  })

  const role: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user'
  const newAccess = signAccessToken(user.userId, role)
  const newRefresh = signRefreshToken(user.userId, role)

  return successResponse(
    { token: newAccess, refreshToken: newRefresh },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
