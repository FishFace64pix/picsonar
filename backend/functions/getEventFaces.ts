/**
 * GET /events/{eventId}/faces
 *
 * Public endpoint used by the QR-scan face browser. Returns sanitized face
 * records only — no S3 keys, no Rekognition IDs.
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
import { getItem, queryItemsPage } from '../src/utils/dynamodb'
import { NotFoundError } from '../src/utils/errors'
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
    endpoint: 'events:faces',
    identity: rateLimitIdentity(event),
    max: 120,
    windowSec: 60,
  })

  const eventData = await getItem(env.EVENTS_TABLE, { eventId })
  if (!eventData) throw new NotFoundError('Event not found')

  const { items, nextCursor } = await queryItemsPage({
    tableName: env.FACES_TABLE,
    indexName: 'eventId-index',
    keyConditionExpression: 'eventId = :eventId',
    expressionAttributeValues: { ':eventId': eventId },
    limit,
    cursor,
  })

  // Public-safe projection — drop rekognitionFaceId (infra leak).
  const faces = items.map((face) => ({
    faceId: face.faceId,
    eventId: face.eventId,
    samplePhotoUrl: face.samplePhotoUrl,
    qrCodeUrl: face.qrCodeUrl,
    associatedPhotos: face.associatedPhotos ?? [],
  }))

  return successResponse(
    { faces, nextCursor },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
