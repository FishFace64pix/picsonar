/**
 * GET /users/me/orders
 *
 * Lists orders owned by the authenticated user. Paginated.
 * Same IDOR fix as getEvents: derive userId from the verified JWT, never from
 * the raw bearer string.
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
    tableName: env.ORDERS_TABLE,
    indexName: 'userId-index',
    keyConditionExpression: 'userId = :userId',
    expressionAttributeValues: { ':userId': jwt.userId },
    limit,
    cursor,
    scanIndexForward: false,
  })

  return successResponse(
    { orders: items, nextCursor },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
