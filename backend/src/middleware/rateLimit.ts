/**
 * Distributed rate limiter backed by DynamoDB.
 *
 * Schema of RATE_LIMITS_TABLE:
 *   pk (string, partition)  = `${endpoint}#${identity}`
 *   windowStart (number)    = epoch ms, rounded to windowMs
 *   count (number)          = incremented atomically
 *   ttl (number)            = epoch seconds (DynamoDB TTL attribute)
 *
 * Sliding-window approximation using fixed windows; correct enough for abuse
 * protection without needing Redis. If the table is missing we fail OPEN
 * (log + allow) so an infra issue does not take down auth/upload endpoints.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { RateLimitError } from '../utils/errors'
import { getEnv } from '../config/env'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export interface RateLimitOptions {
  endpoint: string
  /** Identity key — IP, userId, email, etc. */
  identity: string
  /** Allowed requests inside the window. */
  max: number
  /** Window in seconds. */
  windowSec: number
}

export async function enforceRateLimit(opts: RateLimitOptions): Promise<void> {
  const env = getEnv()
  const table = env.RATE_LIMITS_TABLE
  if (!table) {
    // Infra not ready — fail open but log once.
    console.warn('[rateLimit] RATE_LIMITS_TABLE not configured, skipping')
    return
  }

  const windowMs = opts.windowSec * 1000
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const pk = `${opts.endpoint}#${opts.identity}#${windowStart}`
  const ttl = Math.floor((windowStart + windowMs * 2) / 1000)

  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk },
        UpdateExpression: 'ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': 1, ':ttl': ttl },
        ReturnValues: 'ALL_NEW',
      }),
    )
    const count = Number(res.Attributes?.count ?? 1)
    if (count > opts.max) {
      const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000)
      throw new RateLimitError(
        `Rate limit exceeded for ${opts.endpoint}`,
        retryAfter,
      )
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    // Never block legitimate traffic on a DDB hiccup — fail open.
    console.error('[rateLimit] DDB error, failing open', err)
  }
}

/** Resolve a stable identity for the caller: prefer userId, fallback to IP. */
export function rateLimitIdentity(
  event: import('aws-lambda').APIGatewayProxyEvent,
  userId?: string,
): string {
  if (userId) return `u:${userId}`
  // Use API Gateway's authoritative sourceIp — not the x-forwarded-for header,
  // which a client can trivially spoof to bypass rate limits.
  const ip = event.requestContext?.identity?.sourceIp ?? 'unknown'
  return `ip:${ip}`
}
