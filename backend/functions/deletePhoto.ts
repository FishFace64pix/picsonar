/**
 * DELETE /events/{eventId}/photos/{photoId}
 *
 * Owner/admin only. Cascades to S3 (original + thumbnail), FacesTable, and
 * Rekognition face indices. Event aggregates are updated atomically.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAuth } from '../src/middleware/auth'
import { parsePath } from '../src/middleware/validate'
import { ensureEventOwnership } from '../src/middleware/ownership'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { getItem, deleteItem, updateItem } from '../src/utils/dynamodb'
import { deleteFromS3 } from '../src/utils/s3'
import { deleteFaces } from '../src/utils/rekognition'
import { NotFoundError } from '../src/utils/errors'
import { successResponse } from '../src/utils/response'

const PathSchema = z.object({
  eventId: z.string().uuid(),
  photoId: z.string().uuid(),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const { eventId, photoId } = parsePath(event, PathSchema)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'photos:delete',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 60,
    windowSec: 60,
  })

  await ensureEventOwnership(eventId, jwt)

  const photo = await getItem(env.PHOTOS_TABLE, { photoId })
  if (!photo || photo.eventId !== eventId) {
    throw new NotFoundError('Photo not found')
  }

  // --- S3 cleanup ---
  if (photo.s3Key) {
    await deleteFromS3(env.RAW_PHOTOS_BUCKET, photo.s3Key)
  }
  if (photo.thumbnailS3Key) {
    await deleteFromS3(env.RAW_PHOTOS_BUCKET, photo.thumbnailS3Key)
  }

  // --- Faces cleanup ---
  let facesDeleted = 0
  if (Array.isArray(photo.faces) && photo.faces.length > 0) {
    const rekognitionFaceIds: string[] = []
    for (const faceId of photo.faces) {
      const face = await getItem(env.FACES_TABLE, { faceId })
      if (face?.rekognitionFaceId) {
        rekognitionFaceIds.push(face.rekognitionFaceId)
      }
      await deleteItem(env.FACES_TABLE, { faceId })
    }
    if (rekognitionFaceIds.length > 0) {
      try {
        await deleteFaces(env.REKOGNITION_COLLECTION_ID, rekognitionFaceIds)
      } catch (err) {
        console.error('[deletePhoto] Rekognition delete failed', err)
      }
    }
    facesDeleted = photo.faces.length
  }

  await deleteItem(env.PHOTOS_TABLE, { photoId })

  // Atomic decrement, clamped to >= 0 to avoid underflow on inconsistent state.
  await updateItem(
    env.EVENTS_TABLE,
    { eventId },
    'SET totalPhotos = if_not_exists(totalPhotos, :zero) - :one, totalFaces = if_not_exists(totalFaces, :zero) - :fc',
    { ':one': 1, ':fc': facesDeleted, ':zero': 0 },
  )

  return successResponse(
    { deleted: true, facesDeleted },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
