/**
 * GET /events/{eventId}
 *
 * Public endpoint — guests land here via QR code.
 * We intentionally DO NOT expose owner PII (userId, companyDetails, billing).
 * Authenticated owner/admin callers still get the same sanitized shape;
 * owner-only metadata lives on separate /admin routes.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { parsePath } from '../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { getItem } from '../src/utils/dynamodb'
import { NotFoundError } from '../src/utils/errors'
import { successResponse } from '../src/utils/response'
import { getSignedUrlForDownload } from '../src/utils/s3'

const PathSchema = z.object({ eventId: z.string().uuid() })

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const { eventId } = parsePath(event, PathSchema)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'events:get',
    identity: rateLimitIdentity(event),
    max: 120,
    windowSec: 60,
  })

  const eventData = await getItem(env.EVENTS_TABLE, { eventId })
  if (!eventData) throw new NotFoundError('Event not found')

  // Fetch only the organizer logo — never the owner's full company record.
  let organizerLogo: string | null = null
  if (eventData.userId) {
    const owner = await getItem(env.USERS_TABLE, { userId: eventData.userId })
    const cd = owner?.companyDetails
    if (cd?.logoKey) {
      try {
        organizerLogo = await getSignedUrlForDownload(
          env.RAW_PHOTOS_BUCKET,
          cd.logoKey,
          env.SIGNED_URL_TTL_SECONDS,
        )
      } catch (e) {
        console.warn('[getEvent] organizer logo sign failed', e)
      }
    } else if (cd?.logoUrl) {
      organizerLogo = cd.logoUrl
    }
  }

  // Whitelist only the fields that make sense for the public gallery.
  const publicEvent = {
    eventId: eventData.eventId,
    eventName: eventData.eventName,
    eventDate: eventData.eventDate,
    description: eventData.description,
    createdAt: eventData.createdAt,
    status: eventData.status,
    totalPhotos: eventData.totalPhotos ?? 0,
    totalFaces: eventData.totalFaces ?? 0,
    organizerLogo,
  }

  return successResponse(publicEvent, 200, { requestOrigin: ctx.requestOrigin })
})
