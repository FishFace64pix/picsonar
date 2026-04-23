/**
 * GET /auth/me
 *
 * Returns the authenticated user's profile (sans password / reset tokens).
 * Signs the company logo S3 key if present.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { requireAuth } from '../../src/middleware/auth'
import { getItem } from '../../src/utils/dynamodb'
import { getSignedUrlForDownload } from '../../src/utils/s3'
import { NotFoundError } from '../../src/utils/errors'
import { successResponse } from '../../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const env = getEnv()

  const user = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!user) throw new NotFoundError('User not found')

  const {
    password: _pw,
    resetToken: _rt,
    resetTokenExpiry: _rte,
    ...safeUser
  } = user

  if (safeUser.companyDetails?.logoKey) {
    try {
      safeUser.companyDetails.logoUrl = await getSignedUrlForDownload(
        env.RAW_PHOTOS_BUCKET,
        safeUser.companyDetails.logoKey,
        env.SIGNED_URL_TTL_SECONDS,
      )
    } catch (e) {
      console.warn('[me] logo sign failed', e)
    }
  }

  return successResponse(safeUser, 200, { requestOrigin: ctx.requestOrigin })
})
