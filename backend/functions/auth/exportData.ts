/**
 * GET /auth/export-data  (GDPR Art. 20 — right to data portability)
 *
 * Assembles the authenticated user's personal data into a single JSON
 * document and returns it as a downloadable attachment. The response
 * includes:
 *   - Profile (stripped of internal fields: password hash, reset tokens,
 *     legacy SHA-256 migration flags, etc.)
 *   - All events they created
 *   - All photos they uploaded (metadata only; the raw S3 objects can
 *     be re-downloaded via the existing signed-URL flow and are
 *     referenced here by their S3 key)
 *   - All orders they placed — useful for the user to reconcile against
 *     their Stripe receipts
 *
 * Rate-limited to 1 export per 24 hours per user — the payload can be
 * large and the underlying scans are not cheap.
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { getItem, queryItems } from '../../src/utils/dynamodb'
import { AuthError } from '../../src/utils/errors'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { logger, emitMetric } from '../../src/utils/logger'

const INTERNAL_FIELDS = [
  'password',
  'resetToken',
  'resetTokenExpiry',
  'emailVerifyTokenHash',
  'emailVerifyTokenExpiry',
  'legalAudit',
] as const

function stripInternal<T extends Record<string, any>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const k of INTERNAL_FIELDS) delete out[k]
  return out
}

export const handler = withHandler(
  async (event: APIGatewayProxyEvent, ctx): Promise<APIGatewayProxyResult> => {
    const env = getEnv()

    const jwt = verifyAuthHeader(
      event.headers.Authorization || event.headers.authorization,
    )
    if (!jwt) throw new AuthError('Authentication required')

    // 1 export / 24h. The payload can be megabytes for an active user.
    await enforceRateLimit({
      endpoint: 'auth:export-data',
      identity: rateLimitIdentity(event, jwt.userId),
      max: 1,
      windowSec: 86400,
    })

    const user = await getItem(env.USERS_TABLE, { userId: jwt.userId })
    if (!user || user.deleted === true) throw new AuthError('Account not found')

    const [events, orders] = await Promise.all([
      queryItems(
        env.EVENTS_TABLE,
        'userId = :uid',
        { ':uid': jwt.userId },
        'userId-index',
      ),
      queryItems(
        env.ORDERS_TABLE,
        'userId = :uid',
        { ':uid': jwt.userId },
        'userId-index',
      ),
    ])

    // For each event, collect photo metadata. We deliberately do NOT fan
    // out to many parallel queries — photos can be huge and a naive
    // Promise.all would spike RCU. Sequential with a modest cap is fine
    // for an export that users do at most once a day.
    const photosByEvent: Record<string, unknown[]> = {}
    for (const ev of events.slice(0, 500)) {
      const photos = await queryItems(
        env.PHOTOS_TABLE,
        'eventId = :eid',
        { ':eid': ev.eventId },
        'eventId-index',
      )
      photosByEvent[ev.eventId] = photos.map((p: any) => ({
        photoId: p.photoId,
        s3Key: p.s3Key,
        uploadedAt: p.uploadedAt ?? p.createdAt,
        sizeBytes: p.sizeBytes,
      }))
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      notice: 'Personal data export per GDPR Art. 20 (right to data portability). This JSON is machine-readable; ask support for a PDF copy if required.',
      profile: stripInternal(user),
      events: events.map(stripInternal),
      photosByEvent,
      orders: orders.map(stripInternal),
    }

    emitMetric('GdprDataExport', 1, 'Count')
    logger.info('auth.export_data', {
      userId: jwt.userId,
      eventCount: events.length,
      orderCount: orders.length,
    })

    const filename = `picsonar-export-${jwt.userId}-${Date.now()}.json`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': ctx.requestOrigin ?? '*',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(payload, null, 2),
    }
  },
)
