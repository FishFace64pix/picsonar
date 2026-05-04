/**
 * Scheduled daily cleanup — removes all data for events whose storage period
 * has ended (expiresAt < now).
 *
 * Deletion order per event:
 *   1. Rekognition faces — removed from the collection so future searches
 *      never match against stale faces.
 *   2. DynamoDB Face records
 *   3. S3 photo objects + thumbnails (RAW_PHOTOS_BUCKET)
 *   4. DynamoDB Photo records
 *   5. Event status set to 'expired' — DynamoDB TTL (ttl field) will purge
 *      the event row itself within 48 h.
 *
 * If any step fails the Lambda logs the error and continues with the next
 * event rather than aborting the whole run.
 */
import type { ScheduledEvent } from 'aws-lambda'

import { getEnv } from '../src/config/env'
import {
  scanTablePage,
  queryAllPages,
  deleteItem,
  updateItem,
} from '../src/utils/dynamodb'
import { deleteS3Prefix } from '../src/utils/s3'
import { deleteFaces } from '../src/utils/rekognition'
import { logger, emitMetric } from '../src/utils/logger'

const CHUNK = 25 // DynamoDB parallel delete concurrency

async function deleteInChunks<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i += CHUNK) {
    await Promise.all(items.slice(i, i + CHUNK).map(fn))
  }
}

export const handler = async (_event: ScheduledEvent): Promise<void> => {
  const env = getEnv()
  const now = new Date().toISOString()
  let totalCleaned = 0
  let totalErrors = 0

  logger.info('[cleanup] starting expired-event sweep', { now })

  let cursor: string | undefined
  do {
    const page = await scanTablePage({
      tableName: env.EVENTS_TABLE,
      filterExpression: 'expiresAt < :now AND #s <> :expired',
      expressionAttributeNames: { '#s': 'status' },
      expressionAttributeValues: { ':now': now, ':expired': 'expired' },
      limit: 50,
      cursor,
    })
    cursor = page.nextCursor

    for (const event of page.items) {
      const { eventId } = event
      logger.info('[cleanup] processing expired event', { eventId, expiresAt: event.expiresAt })

      try {
        // 1 — collect Rekognition face IDs
        const rekFaceIds: string[] = []
        const faceRecords: Array<{ faceId: string; rekognitionFaceId?: string }> = []
        for await (const batch of queryAllPages({
          tableName: env.FACES_TABLE,
          keyConditionExpression: 'eventId = :eid',
          expressionAttributeValues: { ':eid': eventId },
          indexName: 'eventId-index',
        })) {
          for (const f of batch) {
            faceRecords.push(f)
            if (f.rekognitionFaceId) rekFaceIds.push(f.rekognitionFaceId)
          }
        }

        // 2 — remove from Rekognition (max 1000 per call)
        for (let i = 0; i < rekFaceIds.length; i += 1000) {
          await deleteFaces(env.REKOGNITION_COLLECTION_ID, rekFaceIds.slice(i, i + 1000)).catch(
            (err) => logger.warn('[cleanup] Rekognition deleteFaces partial failure', { eventId, err }),
          )
        }

        // 3 — delete Face DynamoDB records
        await deleteInChunks(faceRecords, (f) =>
          deleteItem(env.FACES_TABLE, { faceId: f.faceId }),
        )

        // 4 — collect photo records + S3 keys
        const photoRecords: Array<{ photoId: string; s3Key?: string; thumbnailS3Key?: string }> = []
        for await (const batch of queryAllPages({
          tableName: env.PHOTOS_TABLE,
          keyConditionExpression: 'eventId = :eid',
          expressionAttributeValues: { ':eid': eventId },
          indexName: 'eventId-index',
        })) {
          photoRecords.push(...batch)
        }

        // 5 — delete S3 objects: event prefix + thumbnails prefix
        await deleteS3Prefix(env.RAW_PHOTOS_BUCKET, `${eventId}/`)
        await deleteS3Prefix(env.RAW_PHOTOS_BUCKET, `thumbnails/${eventId}/`)

        // 6 — delete Photo DynamoDB records
        await deleteInChunks(photoRecords, (p) =>
          deleteItem(env.PHOTOS_TABLE, { photoId: p.photoId }),
        )

        // 7 — mark event expired (TTL field will purge the row from DynamoDB)
        await updateItem(
          env.EVENTS_TABLE,
          { eventId },
          'SET #s = :expired',
          { ':expired': 'expired' },
          { '#s': 'status' },
        )

        logger.info('[cleanup] event cleaned', {
          eventId,
          faces: faceRecords.length,
          photos: photoRecords.length,
        })
        totalCleaned++
      } catch (err) {
        logger.error('[cleanup] failed to clean event', { eventId, err })
        totalErrors++
        await emitMetric('CleanupEventFailed', 1)
      }
    }
  } while (cursor)

  logger.info('[cleanup] sweep complete', { totalCleaned, totalErrors })
  if (totalCleaned > 0) await emitMetric('ExpiredEventsCleaned', totalCleaned)
}
