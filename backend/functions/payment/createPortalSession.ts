/**
 * POST /billing/portal-session
 *
 * Creates a Stripe Customer Portal session and returns its URL. The
 * portal is the hosted UI customers use to update their card, cancel a
 * subscription, download past invoices, and change their billing email.
 * Offloading this to Stripe means we never render PAN / CVV fields in
 * our own code and we inherit every compliance improvement Stripe ships.
 *
 * Prerequisites (configured via AWS Secrets Manager + Stripe dashboard):
 *   - `STRIPE_SECRET_KEY` on the Lambda env
 *   - Portal branding + features enabled in Stripe dashboard
 *   - A `stripeCustomerId` persisted on the user row (set lazily here on
 *     first portal visit if the user only ever used one-off PaymentIntents
 *     — we look up by metadata on the PaymentIntent → Customer create +
 *     attach)
 *
 * The portal URL is single-use and expires a few minutes after creation,
 * so we do NOT cache it. Users always get a fresh one per click.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'
import Stripe from 'stripe'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { getItem, updateItem } from '../../src/utils/dynamodb'
import { AuthError, ValidationError } from '../../src/utils/errors'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { successResponse } from '../../src/utils/response'
import { logger } from '../../src/utils/logger'


const PortalSchema = z.object({
  /** Where Stripe should return the browser after the portal session. */
  returnUrl: z.string().url(),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const env = getEnv()

  const jwt = verifyAuthHeader(
    event.headers.Authorization || event.headers.authorization,
  )
  if (!jwt) throw new AuthError('Authentication required')

  await enforceRateLimit({
    endpoint: 'billing:portal',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 20,
    windowSec: 60,
  })

  const { returnUrl } = parseBody(event)

  const user = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!user || user.deleted === true) throw new AuthError('Account not found')

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

  // Lazy create / cache a Stripe Customer. This also lets Stripe auto-
  // collect CUI / company info on the first card charge and reuse it.
  let customerId: string | undefined = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.userId },
    })
    customerId = customer.id
    await updateItem(
      env.USERS_TABLE,
      { userId: user.userId },
      'SET stripeCustomerId = :cid, updatedAt = :now',
      { ':cid': customerId, ':now': new Date().toISOString() },
    )
    logger.info('billing.stripe_customer_created', {
      userId: user.userId,
      stripeCustomerId: customerId,
    })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return successResponse(
    { url: session.url },
    200,
    { requestOrigin: ctx.requestOrigin },
  )

  function parseBody(ev: APIGatewayProxyEvent): z.infer<typeof PortalSchema> {
    try {
      const raw = ev.body ? JSON.parse(ev.body) : {}
      return PortalSchema.parse(raw)
    } catch (err) {
      throw new ValidationError((err as Error).message)
    }
  }
})
