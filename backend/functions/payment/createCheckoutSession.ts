/**
 * POST /payment/checkout-session
 *
 * Creates a Stripe Checkout Session (hosted payment page) and returns the
 * redirect URL. The frontend simply does `window.location.href = url`.
 *
 * Stripe Checkout collects:
 *   - Card details (required — Stripe handles PCI compliance)
 *   - Billing address (required — needed for VAT calculation)
 *   - Tax / VAT ID (optional — auto-applied when provided)
 *   - Company name (custom_field, required)
 *
 * After payment Stripe redirects to `success_url` which includes
 * `{CHECKOUT_SESSION_ID}` that the frontend can use to show a receipt.
 *
 * The webhook `checkout.session.completed` is the authoritative handler —
 * it writes the BillingRecord + Order and credits the user.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'
import Stripe from 'stripe'

import { PACKAGES, type PackageId } from '@picsonar/shared'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { requireAuth } from '../../src/middleware/auth'
import { parseBody } from '../../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../../src/middleware/rateLimit'
import { isFromRomania } from '../../src/utils/geoRestriction'
import { ForbiddenError, ValidationError } from '../../src/utils/errors'
import { successResponse } from '../../src/utils/response'
import { getItem } from '../../src/utils/dynamodb'


const CheckoutSessionSchema = z.object({
  packageId: z.enum(['starter', 'studio', 'agency', 'extra_event']),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'payments:checkout-session',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 10,
    windowSec: 60,
  })

  if (!isFromRomania(event)) {
    throw new ForbiddenError('Payments are currently restricted to Romania')
  }

  const currentUser = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!currentUser) throw new ForbiddenError('Account not found')
  if (currentUser.emailVerified !== true) {
    throw new ForbiddenError(
      'Please verify your email before making a purchase. Check your inbox for the confirmation link.',
    )
  }

  const input = parseBody(event, CheckoutSessionSchema)
  const pkg = PACKAGES[input.packageId as PackageId]
  if (!pkg) throw new ValidationError('Unknown package')

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

  const frontendUrl = env.FRONTEND_URL || 'https://picsonar.com'
  // {CHECKOUT_SESSION_ID} is a Stripe template literal — it is NOT a JS
  // template string. Stripe substitutes it with the real session ID at
  // redirect time. Use single-quotes here to remind future readers.
  const successUrl = `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${frontendUrl}/pricing`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',

    // ---- Billing data collection ----------------------------------------
    // Required: Stripe shows a billing address form on the hosted page.
    // This is necessary for Stripe Tax to determine the correct VAT rate.
    billing_address_collection: 'required',

    // Stripe Tax: calculates VAT automatically based on billing address.
    // PREREQUISITE: Activate Stripe Tax in your Stripe Dashboard → Tax.
    // Without activation this call succeeds but no tax is applied.
    automatic_tax: { enabled: true },

    // Optional VAT/tax ID collection — the field appears but is not required.
    // If provided, Stripe validates format and applies reverse-charge for
    // EU B2B customers with a valid VAT ID from a different EU member state.
    tax_id_collection: { enabled: true },

    // ---- Company name custom field --------------------------------------
    // `optional: false` makes this field required on the Checkout page.
    custom_fields: [
      {
        key: 'company_name',
        label: { type: 'custom', custom: 'Company Name / Denumire firmă' },
        type: 'text',
        optional: false,
      },
    ],

    // ---- Line items -------------------------------------------------------
    line_items: [
      {
        quantity: input.quantity,
        price_data: {
          currency: pkg.currency.toLowerCase(),
          unit_amount: pkg.priceMinor,
          product_data: {
            name: `PicSonar ${pkg.name}`,
            description: `${pkg.credits} event credit${pkg.credits > 1 ? 's' : ''} · ${pkg.limits.photoLimitPerEvent} photos/event`,
          },
        },
      },
    ],

    // ---- Customer --------------------------------------------------------
    // Pre-fill email so the customer sees their account email on Checkout.
    customer_email: currentUser.email,

    // ---- Metadata (passed through to webhook) ----------------------------
    // Keep only operational identifiers — no PII that is already on the
    // CustomerDetails object Stripe sends in the webhook payload.
    metadata: {
      userId: jwt.userId,
      packageId: input.packageId,
      quantity: String(input.quantity),
    },

    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  return successResponse(
    { url: session.url, sessionId: session.id },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
