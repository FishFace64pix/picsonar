/**
 * GET /admin/orders
 *
 * Admin-only. Returns a paginated page of orders enriched with the minimal
 * owner info (name, email, companyDetails). User batch resolved via
 * BatchGetItem rather than N getItem calls.
 *
 * Security:
 *   - Previously this endpoint had NO auth check. Anyone could dump the
 *     entire orders table (PII + billing). Now requireAdmin().
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAdmin } from '../src/middleware/auth'
import { parseQuery } from '../src/middleware/validate'
import { scanTablePage, batchGetItems } from '../src/utils/dynamodb'
import { successResponse } from '../src/utils/response'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(2048).optional(),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  requireAdmin(event)
  const { limit, cursor } = parseQuery(event, QuerySchema)
  const env = getEnv()

  const { items: orders, nextCursor } = await scanTablePage({
    tableName: env.ORDERS_TABLE,
    limit,
    cursor,
  })

  const userIds = Array.from(new Set(orders.map((o: any) => o.userId).filter(Boolean)))
  const users = await batchGetItems(
    env.USERS_TABLE,
    userIds.map((userId) => ({ userId })),
  )
  const userMap: Record<string, any> = {}
  for (const u of users) userMap[u.userId] = u

  const enriched = orders
    .map((order: any) => {
      const u = userMap[order.userId]
      return {
        ...order,
        user: u
          ? { name: u.name, email: u.email, companyDetails: u.companyDetails }
          : null,
      }
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  return successResponse(
    { orders: enriched, nextCursor },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
