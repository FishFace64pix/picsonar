/**
 * GET /events/{eventId}/photos
 *
 * Public gallery endpoint. Returns only the fields a viewer needs to render
 * the grid — no internal S3 keys, no upload metadata.
 *
 * Pagination: supports `limit` (1–100, default 50) and `cursor` (opaque
 * base64 LastEvaluatedKey). The previous implementation returned the entire
 * events photo set in one call; for events with 5k photos that would exceed
 * the Lambda 6 MB response limit.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { parsePath, parseQuery } from '../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { queryItemsPage } from '../src/utils/dynamodb'
import { NotFoundError } from '../src/utils/errors'
import { getItem } from '../src/utils/dynamodb'
import { getSignedUrlForDownload } from '../src/utils/s3'
import { successResponse } from '../src/utils/response'

const PathSchema = z.object({ eventId: z.string().uuid() })
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(2048).optional(),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const { eventId } = parsePath(event, PathSchema)
  const { limit, cursor } = parseQuery(event, QuerySchema)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'events:photos',
    identity: rateLimitIdentity(event),
    max: 120,
    windowSec: 60,
  })

  // Verify the event exists — stops IDOR scanning for random UUIDs.
  const eventData = await getItem(env.EVENTS_TABLE, { eventId })
  if (!eventData) throw new NotFoundError('Event not found')

  const { items, nextCursor } = await queryItemsPage({
    tableName: env.PHOTOS_TABLE,
    indexName: 'eventId-index',
    keyConditionExpression: 'eventId = :eventId',
    expressionAttributeValues: { ':eventId': eventId },
    limit,
    cursor,
  })

  const photosWithUrls = await Promise.all(
    items.map(async (photo) => {
      const key = photo.s3Key ?? `${eventId}/${photo.photoId}.jpg`

      // Use thumbnail in the gallery; fall back to original if none.
      let thumbnailUrl: string | undefined
      if (photo.thumbnailS3Key) {
        try {
          thumbnailUrl = await getSignedUrlForDownload(
            env.RAW_PHOTOS_BUCKET,
            photo.thumbnailS3Key,
            env.SIGNED_URL_TTL_SECONDS,
          )
        } catch (e) {
          console.warn('[getEventPhotos] thumbnail sign failed', {
            photoId: photo.photoId,
            e,
          })
        }
      }
      const s3Url = await getSignedUrlForDownload(
        env.RAW_PHOTOS_BUCKET,
        key,
        env.SIGNED_URL_TTL_SECONDS,
      )

      // Whitelisted public fields only.
      return {
        photoId: photo.photoId,
        eventId: photo.eventId,
        uploadedAt: photo.uploadedAt,
        width: photo.width,
        height: photo.height,
        faces: photo.faces ?? [],
        s3Url,
        thumbnailUrl: thumbnailUrl ?? s3Url,
      }
    }),
  )

  return successResponse(
    { photos: photosWithUrls, nextCursor },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
