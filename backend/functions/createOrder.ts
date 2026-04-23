/**
 * POST /orders
 *
 * Admin-only endpoint for manually recording an order (for example: to
 * reconcile an off-platform payment or refund correction). Real user-facing
 * orders are created by the Stripe webhook — this endpoint must NEVER be
 * called directly by a user, otherwise it bypasses payment.
 *
 * Security notes:
 *   - Uses requireAdmin() which verifies a signed JWT with role === 'admin'.
 *     The old implementation parsed `userId:...` out of a bogus colon-delimited
 *     string and trusted it. That allowed anyone to forge an admin order by
 *     sending `Authorization: Bearer any-user-id`.
 *   - Validates body with CreateOrderSchema (integer amountMinor, paymentIntentId,
 *     packageId enum, currency = RON).
 *   - Rate-limited per-admin to catch automation mistakes.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

import { CreateOrderSchema } from '@picsonar/shared/schemas'
import type { Order } from '@picsonar/shared/types'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAdmin } from '../src/middleware/auth'
import { parseBody } from '../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { putItem } from '../src/utils/dynamodb'
import { successResponse } from '../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const admin = requireAdmin(event)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'orders:create',
    identity: rateLimitIdentity(event, admin.userId),
    max: 30,
    windowSec: 60,
  })

  const input = parseBody(event, CreateOrderSchema)

  const order: Order = {
    orderId: uuidv4(),
    userId: admin.userId, // order is *recorded by* this admin
    packageId: input.packageId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    status: 'PAID',
    paymentIntentId: input.paymentIntentId,
    paymentProvider: 'stripe',
    invoiceStatus: 'pending',
    createdAt: new Date().toISOString(),
  }

  await putItem(env.ORDERS_TABLE, order, 'attribute_not_exists(orderId)')

  return successResponse(order, 201, { requestOrigin: ctx.requestOrigin })
})
