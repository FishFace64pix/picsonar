/**
 * POST /auth/logout
 *
 * Invalidates the caller's refresh token. The access token is short-lived
 * (15 min) and expires on its own; we deliberately do NOT track access-token
 * revocation because that would require a blocklist check on every request.
 * The refresh token's jti goes into DynamoDB with TTL = token exp, so the
 * row is garbage-collected automatically on expiry.
 *
 * Idempotent: calling logout twice with the same (already-revoked) token is
 * a no-op and still returns 200 — the user's intent was "log me out" and
 * that's the state the system is already in.
 *
 * We do NOT require the access token to be valid for logout to succeed. If
 * a user's access token has expired they still need to be able to sign out,
 * and a malicious actor can only log someone out (not back in) with a stale
 * refresh token.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { withHandler } from '../../src/middleware/handler'
import { parseBody } from '../../src/middleware/validate'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { verifyRefreshToken } from '../../src/utils/jwt'
import { revokeRefreshToken } from '../../src/utils/tokenRevocation'
import { successResponse } from '../../src/utils/response'

const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  await enforceRateLimit({
    endpoint: 'auth:logout',
    identity: rateLimitIdentity(event),
    max: 30,
    windowSec: 60,
  })

  const { refreshToken } = parseBody(event, LogoutSchema)
  const payload = verifyRefreshToken(refreshToken)

  // Unsigned / expired / non-refresh-type tokens don't need to be revoked
  // (the signature is already invalid) but we still return 200 so clients
  // can reliably clear their own state on logout.
  if (payload) {
    await revokeRefreshToken({
      jti: payload.jti,
      exp: payload.exp,
      reason: 'logout',
      userId: payload.userId,
    })
  }

  return successResponse(
    { success: true },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
