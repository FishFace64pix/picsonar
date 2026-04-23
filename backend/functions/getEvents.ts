/**
 * GET /events
 *
 * Lists events owned by the authenticated user. Paginated.
 *
 * The previous implementation parsed `userId` out of the raw bearer token
 * with `token.split(':')` — a forgeable pattern that allowed anyone to list
 * any user's events by sending `Authorization: Bearer <targetUserId>:whatever`.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAuth } from '../src/middleware/auth'
import { parseQuery } from '../src/middleware/validate'
import { queryItemsPage } from '../src/utils/dynamodb'
import { successResponse } from '../src/utils/response'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(2048).optional(),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const { limit, cursor } = parseQuery(event, QuerySchema)
  const env = getEnv()

  const { items, nextCursor } = await queryItemsPage({
    tableName: env.EVENTS_TABLE,
    indexName: 'userId-index',
    keyConditionExpression: 'userId = :userId',
    expressionAttributeValues: { ':userId': jwt.userId },
    limit,
    cursor,
    scanIndexForward: false, // newest first
  })

  return successResponse(
    { events: items, nextCursor },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
