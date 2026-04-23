/**
 * POST /events/{eventId}/photos/bulk-delete
 *
 * Owner/admin bulk delete. Body: { photoIds: string[] }.
 * Up to 100 photos per call (enforced by DeletePhotosBodySchema).
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { DeletePhotosBodySchema } from '@picsonar/shared/schemas'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAuth } from '../src/middleware/auth'
import { parseBody, parsePath } from '../src/middleware/validate'
import { ensureEventOwnership } from '../src/middleware/ownership'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { getItem, deleteItem, updateItem } from '../src/utils/dynamodb'
import { deleteFromS3 } from '../src/utils/s3'
import { deleteFaces } from '../src/utils/rekognition'
import { successResponse } from '../src/utils/response'

const PathSchema = z.object({ eventId: z.string().uuid() })

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const { eventId } = parsePath(event, PathSchema)
  const { photoIds } = parseBody(event, DeletePhotosBodySchema)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'photos:bulk-delete',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 20,
    windowSec: 60,
  })

  await ensureEventOwnership(eventId, jwt)

  let deletedCount = 0
  let totalFacesDeleted = 0
  const errors: Array<{ photoId: string; error: string }> = []

  for (const photoId of photoIds) {
    try {
      const photo = await getItem(env.PHOTOS_TABLE, { photoId })
      if (!photo || photo.eventId !== eventId) continue

      if (photo.s3Key) await deleteFromS3(env.RAW_PHOTOS_BUCKET, photo.s3Key)
      if (photo.thumbnailS3Key) {
        await deleteFromS3(env.RAW_PHOTOS_BUCKET, photo.thumbnailS3Key)
      }

      if (Array.isArray(photo.faces) && photo.faces.length > 0) {
        const rekIds: string[] = []
        for (const faceId of photo.faces) {
          const face = await getItem(env.FACES_TABLE, { faceId })
          if (face?.rekognitionFaceId) rekIds.push(face.rekognitionFaceId)
          await deleteItem(env.FACES_TABLE, { faceId })
        }
        if (rekIds.length > 0) {
          try {
            await deleteFaces(env.REKOGNITION_COLLECTION_ID, rekIds)
          } catch (err) {
            console.error('[deletePhotos] Rekognition delete failed', err)
          }
        }
        totalFacesDeleted += photo.faces.length
      }

      await deleteItem(env.PHOTOS_TABLE, { photoId })
      deletedCount++
    } catch (err) {
      console.error('[deletePhotos] per-photo failure', { photoId, err })
      errors.push({
        photoId,
        error: (err as Error).message ?? 'unknown',
      })
    }
  }

  if (deletedCount > 0) {
    await updateItem(
      env.EVENTS_TABLE,
      { eventId },
      'SET totalPhotos = if_not_exists(totalPhotos, :zero) - :pc, totalFaces = if_not_exists(totalFaces, :zero) - :fc',
      { ':pc': deletedCount, ':fc': totalFacesDeleted, ':zero': 0 },
    )
  }

  return successResponse(
    { deletedCount, totalFacesDeleted, errors },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
