/**
 * POST /events/{eventId}/photos
 *
 * Owner/admin upload of an event photo. Multipart/form-data (field `photo`).
 *
 * Security:
 *   - requireAuth + ensureEventOwnership — previously ANY authenticated (or
 *     unauthenticated) user could upload into someone else's event.
 *   - validateImageBuffer: magic-byte check + size limit from QUOTA.
 *     Without this we trusted the Content-Type header and the frontend
 *     could upload arbitrary executable bytes.
 *   - photoLimit enforced by a ConditionExpression so concurrent uploads
 *     cannot overshoot the plan cap.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
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
import { putItem, updateItem } from '../src/utils/dynamodb'
import { uploadToS3, getSignedUrlForDownload } from '../src/utils/s3'
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from '../src/utils/errors'
import { validateImageBuffer } from '../src/utils/fileValidation'
import { successResponse } from '../src/utils/response'

const PathSchema = z.object({ eventId: z.string().uuid() })

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const { eventId } = parsePath(event, PathSchema)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'photos:upload',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 300,
    windowSec: 60,
  })

  const eventData = await ensureEventOwnership(eventId, jwt)

  if ((eventData as any).status !== 'active') {
    throw new ForbiddenError('Event is no longer active')
  }
  const photoLimit = (eventData as any).photoLimit ?? 1000

  const contentType =
    event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new ValidationError('Content-Type must be multipart/form-data')
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const parser = require('lambda-multipart-parser')
  const parsed = await parser.parse(event)
  const file = parsed.files?.find((f: any) => f.fieldname === 'photo')
  if (!file) {
    throw new ValidationError("Photo file is missing in form data (field 'photo')")
  }

  // Magic-byte + size validation BEFORE the S3 upload.
  const { mime, ext } = await validateImageBuffer(file.content)

  const photoId = uuidv4()
  const key = `${eventId}/${photoId}.${ext}`

  // --- Reserve a slot atomically. Fails if photoLimit would be exceeded. ---
  try {
    await updateItem(
      env.EVENTS_TABLE,
      { eventId },
      'SET totalPhotos = if_not_exists(totalPhotos, :zero) + :one',
      { ':one': 1, ':zero': 0, ':max': photoLimit },
      undefined,
      'if_not_exists(totalPhotos, :zero) < :max',
    )
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      throw new ForbiddenError(
        `Photo limit reached (max ${photoLimit} per event)`,
      )
    }
    throw err
  }

  // --- Upload to S3 ---
  try {
    await uploadToS3(env.RAW_PHOTOS_BUCKET, key, file.content, mime)
  } catch (err) {
    // Release the reserved slot.
    await updateItem(
      env.EVENTS_TABLE,
      { eventId },
      'SET totalPhotos = totalPhotos - :one',
      { ':one': 1 },
    ).catch((refundErr) =>
      console.error('[uploadPhoto] slot refund failed', { eventId, refundErr }),
    )
    throw new AppError('Failed to upload photo', 500, 'S3_UPLOAD_FAILED')
  }

  const s3Url = await getSignedUrlForDownload(
    env.RAW_PHOTOS_BUCKET,
    key,
    env.SIGNED_URL_TTL_SECONDS,
  )

  const photo = {
    photoId,
    eventId,
    s3Key: key,
    s3Url,
    mime,
    sizeBytes: file.content.length,
    faces: [] as string[],
    uploadedAt: new Date().toISOString(),
  }

  await putItem(env.PHOTOS_TABLE, photo)

  return successResponse(photo, 201, { requestOrigin: ctx.requestOrigin })
})
