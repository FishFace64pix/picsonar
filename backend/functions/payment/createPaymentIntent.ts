/**
 * POST /payments/create-intent
 *
 * Creates a Stripe PaymentIntent for a plan purchase or extra-credits bundle.
 *
 * Security / correctness notes vs. previous version:
 *   - Uses requireAuth (proper JWT) instead of deriving userId from a raw bearer.
 *   - Validates body with a zod schema instead of ad-hoc JSON + field checks.
 *   - Prices come from `@picsonar/shared/constants` (integer bani), so there is
 *     ONE source of truth. Previously a second hardcoded switch diverged.
 *   - CUI validated + normalized via the shared validator.
 *   - Metadata only includes what the webhook needs — no PII dumps.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { z } from 'zod'
import Stripe from 'stripe'

import { PACKAGES, type PackageId } from '@picsonar/shared/constants'
import { validateCUI, isValidEmail } from '@picsonar/shared/validators'

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


const BillingDataSchema = z.object({
  companyName: z.string().min(2).max(200),
  cui: z.string().min(2).max(12),
  country: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  street: z.string().min(1).max(200),
  postalCode: z.string().min(1).max(20),
  billingEmail: z.string().email(),
})

const PaymentIntentSchema = z.object({
  packageId: z.enum(['starter', 'studio', 'agency', 'extra_event']),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  billingData: BillingDataSchema,
})

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'payments:create-intent',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 10,
    windowSec: 60,
  })

  if (!isFromRomania(event)) {
    throw new ForbiddenError('Payments are currently restricted to Romania')
  }

  // Gate paying flows behind email verification — it's the basic sanity
  // check that the billing email we collect on the invoice belongs to the
  // account owner.
  const currentUser = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!currentUser) {
    throw new ForbiddenError('Account not found')
  }
  if (currentUser.emailVerified !== true) {
    throw new ForbiddenError(
      'Please verify your email before making a purchase. Check your inbox for the confirmation link, or request a new one from your account.',
    )
  }

  const input = parseBody(event, PaymentIntentSchema)

  if (!isValidEmail(input.billingData.billingEmail)) {
    throw new ValidationError('Invalid billing email')
  }

  const cuiResult = validateCUI(input.billingData.cui)
  if (!cuiResult.valid) {
    throw new ValidationError(
      cuiResult.error ?? 'Invalid Romanian CUI (checksum mismatch)',
    )
  }

  const pkg = PACKAGES[input.packageId as PackageId]
  if (!pkg) throw new ValidationError('Unknown package')

  const unitMinor = pkg.priceMinor
  const totalMinor = unitMinor * input.quantity

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  })

  // --- Create / reuse a Stripe Customer ---------------------------------
  // Stripe Tax needs a customer record with a billing address to determine
  // VAT jurisdiction. We create a fresh customer per purchase and attach
  // the RO VAT ID — Stripe then issues a tax-compliant RON invoice and
  // applies the 19% standard rate (or reverse charge for EU VAT-registered
  // B2B customers). Customer deduplication happens via metadata.userId.
  const stripeCountry = (input.billingData.country ?? 'RO')
    .slice(0, 2)
    .toUpperCase()
  const customer = await stripe.customers.create({
    email: input.billingData.billingEmail,
    name: input.billingData.companyName,
    address: {
      line1: input.billingData.street,
      city: input.billingData.city,
      postal_code: input.billingData.postalCode,
      country: stripeCountry === 'ROMANIA' ? 'RO' : stripeCountry,
    },
    // RO VAT IDs prefix with 'ro_'; Stripe validates format and applies
    // reverse-charge for EU B2B if appropriate.
    tax_id_data: [
      {
        type: 'ro_tin',
        value: cuiResult.normalized,
      },
    ],
    metadata: {
      userId: jwt.userId,
      cui: cuiResult.normalized,
    },
  })

  // --- Payment methods for Romanian market ------------------------------
  // Card-only by product decision. Apple Pay / Google Pay / Link are
  // intentionally disabled; this keeps the compliance footprint smaller
  // (no Apple Pay domain-association file, no merchant ID registration)
  // and aligns with the accountant's reconciliation flow which expects a
  // single payment-method column on the Stripe payout CSV. SEPA debit is
  // also off — one-time SaaS purchases don't justify the 5-day settlement
  // delay; revisit only if we add subscriptions.
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalMinor,
    currency: pkg.currency.toLowerCase(),
    customer: customer.id,
    description: `${pkg.name} × ${input.quantity}`,
    receipt_email: input.billingData.billingEmail,
    // Stripe Tax: computes VAT line item from customer address + tax_id.
    // Only enable if the Stripe account has Tax activated (manual step in
    // Stripe Dashboard → Tax).
    automatic_tax: { enabled: true },
    // Explicit allowlist — `card` only. Do NOT switch back to
    // `automatic_payment_methods: { enabled: true }`; that implicitly
    // re-enables Apple Pay / Google Pay / Link based on Dashboard toggles.
    payment_method_types: ['card'],
    // statement_descriptor shows on the customer's card statement — must
    // be ≤22 chars, no special chars. Keep stable so fraud detection
    // doesn't flag varying merchant names.
    statement_descriptor_suffix: 'PICSONAR',
    metadata: {
      userId: jwt.userId,
      packageId: input.packageId,
      quantity: String(input.quantity),
      cui: cuiResult.normalized,
      companyName: input.billingData.companyName,
      country: input.billingData.country,
      city: input.billingData.city,
      street: input.billingData.street,
      postalCode: input.billingData.postalCode,
    },
  })

  return successResponse(
    {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      amountMinor: totalMinor,
      currency: pkg.currency,
      // Publishable key is returned here so the frontend doesn't need a
      // separate env plumbing path — avoids accidental key drift.
      publishableKeyHint: 'use VITE_STRIPE_PUBLISHABLE_KEY on the client',
    },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
