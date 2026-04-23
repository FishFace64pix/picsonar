/**
 * POST /events/{eventId}/match
 *
 * Public face-matching endpoint — the product's core guest flow.
 *
 * Security:
 *   - NO auth (guests scan a QR and upload a selfie).
 *   - DynamoDB-backed rate limit (per IP + per event): prevents abuse of
 *     this expensive endpoint. The previous in-memory limiter was per-Lambda
 *     instance, so trivially defeated by fan-out across cold starts.
 *   - validateImageBuffer: magic-byte + size guard.
 *   - FaceIndex batch-fetched once per event (O(1) lookup), then photos
 *     fetched in parallel per face.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { QUOTA } from '@picsonar/shared/constants'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { parsePath, parseQuery } from '../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { getItem, queryItems } from '../src/utils/dynamodb'
import { searchFacesByImage } from '../src/utils/rekognition'
import { getSignedUrlForDownload } from '../src/utils/s3'
import { validateImageBuffer } from '../src/utils/fileValidation'
import { NotFoundError, ValidationError } from '../src/utils/errors'
import { successResponse } from '../src/utils/response'

// eventId is accepted either on the path or the querystring for backward compat.
const PathSchema = z.object({ eventId: z.string().uuid().optional() })
const QuerySchema = z.object({ eventId: z.string().uuid().optional() })

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()
  const path = parsePath(event, PathSchema)
  const query = parseQuery(event, QuerySchema)
  const eventId = path.eventId ?? query.eventId
  if (!eventId) throw new ValidationError('eventId is required')

  await enforceRateLimit({
    endpoint: `match:${eventId}`,
    identity: rateLimitIdentity(event),
    max: QUOTA.MATCH_PER_MINUTE,
    windowSec: 60,
  })

  // Verify the event exists & is active.
  const eventData = await getItem(env.EVENTS_TABLE, { eventId })
  if (!eventData) throw new NotFoundError('Event not found')

  const contentType =
    event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? ''
  let imageBuffer: Buffer

  if (contentType.includes('multipart/form-data')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const parser = require('lambda-multipart-parser')
    const parsed = await parser.parse(event)
    const file = parsed.files?.find((f: any) => f.fieldname === 'image')
    if (!file) throw new ValidationError("Image file missing (field 'image')")
    imageBuffer = file.content
  } else {
    const body = event.body ?? ''
    if (!body) throw new ValidationError('Image data required')
    imageBuffer = event.isBase64Encoded
      ? Buffer.from(body, 'base64')
      : Buffer.from(body, 'binary')
  }

  // Magic-byte + size validation, capped at QUOTA.MAX_FACE_BYTES (smaller
  // than photo upload limit — selfie only).
  await validateImageBuffer(imageBuffer, {
    maxBytes: QUOTA.MAX_FACE_BYTES,
  })

  // --- Rekognition search ---
  const faceMatches = await searchFacesByImage(
    env.REKOGNITION_COLLECTION_ID,
    imageBuffer,
  )
  if (faceMatches.length === 0) {
    return successResponse({ matches: [] }, 200, {
      requestOrigin: ctx.requestOrigin,
    })
  }

  // --- Index all event faces ONCE for O(1) lookup ---
  const allEventFaces = await queryItems(
    env.FACES_TABLE,
    'eventId = :eventId',
    { ':eventId': eventId },
    'eventId-index',
  )
  const faceMap = new Map<string, any>()
  for (const face of allEventFaces) {
    if (face.rekognitionFaceId) faceMap.set(face.rekognitionFaceId, face)
  }

  // --- Resolve matches → photos (parallel per face) ---
  const matches = await Promise.all(
    faceMatches.map(async (match) => {
      const rekognitionFaceId = match.Face?.FaceId
      if (!rekognitionFaceId) return null
      const similarity = match.Similarity ?? 0
      if (similarity < QUOTA.FACE_MATCH_THRESHOLD) return null

      const faceRecord = faceMap.get(rekognitionFaceId)
      if (!faceRecord) return null

      const associatedPhotos: string[] = faceRecord.associatedPhotos ?? []
      const photos = (
        await Promise.all(
          associatedPhotos.map(async (photoId) => {
            const photo = await getItem(env.PHOTOS_TABLE, { photoId })
            if (!photo) return null
            if (photo.s3Key) {
              photo.s3Url = await getSignedUrlForDownload(
                env.RAW_PHOTOS_BUCKET,
                photo.s3Key,
                env.SIGNED_URL_TTL_SECONDS,
              )
            }
            return {
              photoId: photo.photoId,
              eventId: photo.eventId,
              s3Url: photo.s3Url,
              thumbnailUrl: photo.thumbnailS3Key
                ? await getSignedUrlForDownload(
                    env.RAW_PHOTOS_BUCKET,
                    photo.thumbnailS3Key,
                    env.SIGNED_URL_TTL_SECONDS,
                  )
                : photo.s3Url,
              uploadedAt: photo.uploadedAt,
            }
          }),
        )
      ).filter((p): p is NonNullable<typeof p> => p !== null)

      return {
        faceId: faceRecord.faceId,
        confidence: similarity,
        photos,
      }
    }),
  )

  return successResponse(
    { matches: matches.filter((m): m is NonNullable<typeof m> => m !== null) },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
