/**
 * POST /webhook/stripe
 *
 * Single Stripe webhook entry point. Verifies the signature and routes
 * by event type:
 *
 *   payment_intent.succeeded  → create Order, credit user, issue local PDF
 *                               invoice, email receipt
 *   payment_intent.payment_failed → mark Order as FAILED, alert user by
 *                               email, emit metric
 *   charge.refunded           → mark Order REFUNDED, reverse credit
 *                               (atomic, best-effort), emit metric
 *   charge.dispute.created    → mark Order DISPUTED, emit alarm metric so
 *                               ops gets paged and can respond in Stripe's
 *                               dispute-evidence window
 *
 * Every mutation is keyed on an idempotent primary key so Stripe retries
 * are safe. We never use `withHandler` here because Stripe's SDK requires
 * the raw, untouched request body for signature verification.
 *
 * E-invoicing: the accountant handles ANAF e-Factura submission monthly
 * from the Stripe dashboard export. We still generate a local PDF per
 * order because customers expect a receipt attachment and S3 retention
 * (5-year lifecycle) covers fiscal audit trail.
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import Stripe from 'stripe'

import { getEnv } from '../../src/config/env'
import { successResponse, errorResponse } from '../../src/utils/response'
import { putItem, getItem, updateItem } from '../../src/utils/dynamodb'
import { PACKAGES } from '../../src/constants/packages'
import {
  generateInvoiceId,
  normalizeCountry,
  normalizeVatId,
  formatAddress,
  getCustomFieldValue,
  type BillingRecord,
} from '../../src/utils/billing'
import { generateAndUploadInvoice } from '../../src/utils/invoice'
import { sendEmail } from '../../src/utils/email'
import { getInvoiceEmailTemplate } from '../../src/email/templates/invoiceTemplate'
import { getPaymentFailedTemplate } from '../../src/email/templates/paymentFailedTemplate'
import { logger, emitMetric } from '../../src/utils/logger'


export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const env = getEnv()
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

  // ---- 1. Signature verification -----------------------------------
  let stripeEvent: any
  try {
    const signature =
      event.headers['Stripe-Signature'] ?? event.headers['stripe-signature']
    if (!signature) return errorResponse('Missing Stripe-Signature', 400)
    stripeEvent = stripe.webhooks.constructEvent(
      event.body ?? '',
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err: any) {
    logger.warn('stripe.webhook.bad_signature', { message: err.message })
    return errorResponse(`Webhook Error: ${err.message}`, 400)
  }

  const log = logger.child({
    stripeEventId: stripeEvent.id,
    stripeEventType: stripeEvent.type,
  })

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent, env, log)
        return successResponse({ received: true, handled: true })

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(stripeEvent, env, log)
        return successResponse({ received: true, handled: true })

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(stripeEvent, env, log)
        return successResponse({ received: true, handled: true })

      case 'charge.refunded':
        await handleChargeRefunded(stripeEvent, env, log)
        return successResponse({ received: true, handled: true })

      case 'charge.dispute.created':
        await handleDisputeCreated(stripeEvent, env, log)
        return successResponse({ received: true, handled: true })

      default:
        log.info('stripe.webhook.ignored')
        return successResponse({ received: true, handled: false })
    }
  } catch (err) {
    log.error('stripe.webhook.handler_failed', {
      err: (err as Error).message,
    })
    emitMetric('StripeWebhookHandlerFailed', 1, 'Count', {
      eventType: stripeEvent.type,
    })
    // Return 500 so Stripe retries with exponential backoff.
    return errorResponse('Webhook handler failed', 500)
  }
}

// ---------------------------------------------------------------------
// payment_intent.succeeded — happy path
// ---------------------------------------------------------------------
async function handlePaymentSucceeded(
  stripeEvent: any,
  env: ReturnType<typeof getEnv>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  const paymentIntent = stripeEvent.data.object as any
  const orderId = paymentIntent.id as string
  const metadata = paymentIntent.metadata || {}
  const {
    userId,
    packageId,
    type,
    quantity,
    companyName,
    cui,
    country,
    city,
    street,
    postalCode,
  } = metadata

  // Validate required metadata fields before doing any work. Missing userId or
  // packageId means the PaymentIntent was created with bad metadata; we cannot
  // credit a user we cannot identify.
  if (!userId || !packageId) {
    log.error('stripe.webhook.missing_required_metadata', { orderId, userId, packageId })
    emitMetric('StripeWebhookMissingMetadata', 1, 'Count', { orderId })
    // Return without throwing so Stripe does not retry — this is a data error,
    // not a transient failure. Ops must investigate the PaymentIntent directly.
    return
  }

  const qty = parseInt(quantity ?? '1', 10) || 1
  const amountMinor = paymentIntent.amount as number
  const currency = (
    (paymentIntent.currency ?? 'ron') as string
  ).toUpperCase() as 'RON' | 'EUR' | 'USD'

  // Idempotency — key by paymentIntent.id. If we already marked PAID,
  // Stripe is retrying; skip.
  const existingOrder = await getItem(env.ORDERS_TABLE, { orderId })
  if (existingOrder && existingOrder.status === 'PAID') {
    log.info('stripe.webhook.idempotent_skip', { orderId })
    return
  }

  const billingData = {
    companyName: companyName ?? 'Unknown',
    cui: cui ?? '',
    country: country ?? 'Romania',
    city: city ?? '',
    street: street ?? '',
    postalCode: postalCode ?? '',
    billingEmail: paymentIntent.receipt_email ?? '',
  }

  const order = {
    orderId,
    userId,
    amount: amountMinor,
    currency,
    packageId,
    status: 'PAID',
    paymentProvider: 'stripe',
    createdAt: new Date().toISOString(),
    invoiceSnapshot: billingData,
    invoiceStatus: 'pending' as const,
    type: type || 'credit_bundle',
    quantity: qty,
  }
  await putItem(env.ORDERS_TABLE, order)

  // Credit application — best-effort, loud metric on failure.
  try {
    if (type === 'extra_event') {
      await updateItem(
        env.USERS_TABLE,
        { userId },
        'set eventCredits = if_not_exists(eventCredits, :zero) + :inc',
        { ':zero': 0, ':inc': qty },
      )
    } else {
      const pkg = (PACKAGES as any)[packageId]
      if (pkg) {
        const creditsToAdd = (pkg.credits ?? 0) * qty
        await updateItem(
          env.USERS_TABLE,
          { userId },
          'set eventCredits = if_not_exists(eventCredits, :zero) + :inc, subscriptionStatus = :status, #p = :plan',
          {
            ':zero': 0,
            ':inc': creditsToAdd,
            ':status': 'active',
            ':plan': packageId,
          },
          { '#p': 'plan' },
        )
      }
    }
  } catch (creditErr) {
    log.error('stripe.webhook.credit_failed', {
      orderId,
      err: (creditErr as Error).message,
    })
    emitMetric('CreditApplyFailed', 1, 'Count')
    // Keep going — we still issue the invoice + email; ops triages.
  }

  // ---- Local PDF invoice (muhasebeci handles ANAF e-Factura manually)
  let invoicePdfBuffer: Buffer | null = null
  let invoiceNumberForEmail = orderId

  try {
    const pkg = (PACKAGES as any)[packageId]
    const productName = pkg?.name ?? type ?? 'PicSonar credit'
    const invoiceData = {
      orderId,
      date: new Date().toLocaleDateString('ro-RO'),
      companyName: billingData.companyName,
      cui: billingData.cui,
      address: `${billingData.street}, ${billingData.city}, ${billingData.country}`,
      packageName: productName,
      amount: amountMinor / 100,
      currency,
    }
    const s3Key = await generateAndUploadInvoice(invoiceData)

    await updateItem(
      env.ORDERS_TABLE,
      { orderId },
      'set invoiceStatus = :status, invoiceProvider = :prov, invoiceNumber = :num, invoiceS3Key = :key',
      {
        ':status': 'issued',
        ':prov': 'local-pdf',
        ':num': orderId,
        ':key': s3Key,
      },
    )

    const s3 = new S3Client({ region: env.AWS_REGION })
    const s3Res = await s3.send(
      new GetObjectCommand({
        Bucket: env.INVOICES_BUCKET ?? '',
        Key: s3Key,
      }),
    )
    if (s3Res.Body) {
      const chunks: Buffer[] = []
      for await (const chunk of s3Res.Body as any) chunks.push(chunk)
      invoicePdfBuffer = Buffer.concat(chunks)
    }
    emitMetric('InvoiceIssued', 1, 'Count', { currency })
  } catch (invoiceErr) {
    log.error('stripe.webhook.invoice_failed', {
      orderId,
      err: (invoiceErr as Error).message,
    })
    emitMetric('InvoiceFailed', 1, 'Count')
    await updateItem(
      env.ORDERS_TABLE,
      { orderId },
      'set invoiceStatus = :status, invoiceError = :err',
      { ':status': 'failed', ':err': (invoiceErr as Error).message },
    )
  }

  // ---- Receipt email
  try {
    if (billingData.billingEmail) {
      const emailContent = getInvoiceEmailTemplate(
        billingData.companyName,
        invoiceNumberForEmail,
        amountMinor / 100,
      )
      await sendEmail({
        to: billingData.billingEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        attachments: invoicePdfBuffer
          ? [
              {
                filename: `Invoice_${invoiceNumberForEmail}.pdf`,
                content: invoicePdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      })
      log.info('stripe.webhook.email_sent', {
        orderId,
        to: billingData.billingEmail,
      })
    }
  } catch (emailErr) {
    log.error('stripe.webhook.email_failed', {
      orderId,
      err: (emailErr as Error).message,
    })
    emitMetric('InvoiceEmailFailed', 1, 'Count')
  }
}

// ---------------------------------------------------------------------
// payment_intent.payment_failed — notify customer, alarm, do NOT credit
// ---------------------------------------------------------------------
async function handlePaymentFailed(
  stripeEvent: any,
  env: ReturnType<typeof getEnv>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  const paymentIntent = stripeEvent.data.object as any
  const orderId = paymentIntent.id as string
  const metadata = paymentIntent.metadata || {}
  const failureMessage =
    paymentIntent.last_payment_error?.message ?? 'Payment was declined'
  const billingEmail = paymentIntent.receipt_email ?? null

  // Mark Order FAILED for audit — PK is paymentIntent.id so same
  // idempotency window as the success path.
  const existing = await getItem(env.ORDERS_TABLE, { orderId })
  if (!existing) {
    await putItem(env.ORDERS_TABLE, {
      orderId,
      userId: metadata.userId ?? 'unknown',
      amount: paymentIntent.amount,
      currency: (paymentIntent.currency ?? 'ron').toUpperCase(),
      status: 'FAILED',
      paymentProvider: 'stripe',
      createdAt: new Date().toISOString(),
      failureReason: failureMessage,
    })
  } else if (existing.status !== 'PAID') {
    await updateItem(
      env.ORDERS_TABLE,
      { orderId },
      'set #s = :s, failureReason = :r',
      { ':s': 'FAILED', ':r': failureMessage },
      { '#s': 'status' },
    )
  }

  emitMetric('PaymentFailed', 1, 'Count')

  // Customer-facing email — best-effort.
  if (billingEmail) {
    try {
      const template = getPaymentFailedTemplate(failureMessage)
      await sendEmail({
        to: billingEmail,
        subject: template.subject,
        html: template.html,
      })
    } catch (err) {
      log.warn('stripe.webhook.failed_email_send_failed', {
        orderId,
        err: (err as Error).message,
      })
    }
  }
}

// ---------------------------------------------------------------------
// charge.refunded — reverse credit (best-effort), mark REFUNDED
// ---------------------------------------------------------------------
async function handleChargeRefunded(
  stripeEvent: any,
  env: ReturnType<typeof getEnv>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  const charge = stripeEvent.data.object as any
  const orderId = (charge.payment_intent ?? charge.id) as string
  const existing = await getItem(env.ORDERS_TABLE, { orderId })
  if (!existing) {
    log.warn('stripe.webhook.refund_no_order', { orderId })
    return
  }
  if (existing.status === 'REFUNDED') {
    return // idempotent
  }

  const refundedAmount =
    (charge.amount_refunded as number) ?? existing.amount ?? 0
  const isFullRefund = refundedAmount >= (existing.amount ?? 0)

  await updateItem(
    env.ORDERS_TABLE,
    { orderId },
    'set #s = :s, refundedAmount = :r, refundedAt = :t',
    {
      ':s': isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      ':r': refundedAmount,
      ':t': new Date().toISOString(),
    },
    { '#s': 'status' },
  )

  // Credit reversal — best-effort. We use atomic SET with a floor at 0
  // via the condition expression so we never go negative.
  if (isFullRefund && existing.userId && existing.packageId) {
    const pkg = (PACKAGES as any)[existing.packageId]
    const creditsToReverse =
      existing.type === 'extra_event'
        ? existing.quantity ?? 1
        : (pkg?.credits ?? 0) * (existing.quantity ?? 1)

    if (creditsToReverse > 0) {
      try {
        await updateItem(
          env.USERS_TABLE,
          { userId: existing.userId },
          'set eventCredits = if_not_exists(eventCredits, :zero) - :dec',
          { ':zero': 0, ':dec': creditsToReverse },
          undefined,
          // Guard so refunds can't drop the balance below zero — we
          // flag the mismatch as a metric for ops to reconcile.
          'eventCredits >= :dec',
        )
      } catch (err) {
        log.warn('stripe.webhook.refund_credit_reversal_skipped', {
          orderId,
          creditsToReverse,
          err: (err as Error).message,
        })
        emitMetric('RefundCreditReversalSkipped', 1, 'Count')
      }
    }
  }

  emitMetric('ChargeRefunded', 1, 'Count', {
    full: String(isFullRefund),
  })
  log.info('stripe.webhook.refund_processed', {
    orderId,
    refundedAmount,
    isFullRefund,
  })
}

// ---------------------------------------------------------------------
// charge.dispute.created — mark DISPUTED, raise alarm (on-call pages)
// ---------------------------------------------------------------------
async function handleDisputeCreated(
  stripeEvent: any,
  env: ReturnType<typeof getEnv>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  const dispute = stripeEvent.data.object as any
  const chargeId = dispute.charge as string
  const paymentIntentId = dispute.payment_intent as string | undefined
  const orderId = paymentIntentId ?? chargeId

  const existing = await getItem(env.ORDERS_TABLE, { orderId })
  if (existing) {
    await updateItem(
      env.ORDERS_TABLE,
      { orderId },
      'set #s = :s, disputeId = :d, disputeReason = :r, disputeAt = :t',
      {
        ':s': 'DISPUTED',
        ':d': dispute.id,
        ':r': dispute.reason ?? 'unknown',
        ':t': new Date().toISOString(),
      },
      { '#s': 'status' },
    )
  }

  // Dispute is a SEV-2 signal — Stripe gives us ~7 days to respond with
  // evidence. Alarm metric routes through SNS to the on-call.
  emitMetric('ChargeDisputeCreated', 1, 'Count', {
    reason: dispute.reason ?? 'unknown',
  })
  log.error('stripe.webhook.dispute_created', {
    orderId,
    disputeId: dispute.id,
    reason: dispute.reason,
    evidenceDueBy: dispute.evidence_details?.due_by,
  })
}

// ---------------------------------------------------------------------
// checkout.session.completed — normalise billing data, write record,
// credit user. This is the authoritative handler for the Checkout flow.
// The subsequent payment_intent.succeeded event will find the order
// already PAID and skip via its idempotency guard.
// ---------------------------------------------------------------------
async function handleCheckoutSessionCompleted(
  stripeEvent: any,
  env: ReturnType<typeof getEnv>,
  log: ReturnType<typeof logger.child>,
): Promise<void> {
  const session = stripeEvent.data.object as any
  const sessionId = session.id as string

  // Only process sessions where the payment has been collected. For
  // payment_status === 'unpaid' (e.g. subscriptions with trial) we wait
  // for the invoice.paid event instead.
  if (session.payment_status !== 'paid') {
    log.info('checkout.session.not_yet_paid', {
      sessionId,
      payment_status: session.payment_status,
    })
    return
  }

  const paymentIntentId = session.payment_intent as string | null

  // ---- Deduplication -----------------------------------------------
  // Keyed on stripeSessionId (PK of the billing_records table).
  const billingTable = (env as any).BILLING_RECORDS_TABLE as string | undefined
  if (billingTable) {
    const existingRecord = await getItem(billingTable, { stripeSessionId: sessionId })
    if (existingRecord) {
      log.info('checkout.session.duplicate', { sessionId })
      return
    }
  }

  // Also guard via the orders table so we don't double-credit if the
  // webhook fires twice before the billing table write succeeds.
  if (paymentIntentId) {
    const existingOrder = await getItem(env.ORDERS_TABLE, { orderId: paymentIntentId })
    if (existingOrder && existingOrder.status === 'PAID') {
      log.info('checkout.session.order_already_paid', { sessionId, paymentIntentId })
      return
    }
  }

  // ---- Metadata validation -----------------------------------------
  const metadata = session.metadata || {}
  const userId = metadata.userId as string | undefined
  const packageId = metadata.packageId as string | undefined

  if (!userId || !packageId) {
    log.error('checkout.session.missing_metadata', { sessionId, userId, packageId })
    emitMetric('CheckoutSessionMissingMetadata', 1, 'Count', {})
    // Non-retriable data error — don't throw so Stripe stops retrying.
    return
  }

  const quantity = parseInt(metadata.quantity ?? '1', 10) || 1

  // ---- Customer + billing data -------------------------------------
  const customerDetails = session.customer_details || {}
  const billingAddress = customerDetails.address || {}
  const taxIds: Array<{ type: string; value: string }> = customerDetails.tax_ids || []

  const country = normalizeCountry(billingAddress.country)
  const rawVatId: string | null = taxIds[0]?.value ?? null

  const { vatId, vatIdVerified } = rawVatId
    ? normalizeVatId(rawVatId, country)
    : { vatId: null, vatIdVerified: false }

  const customerType: 'B2B' | 'B2C' = vatId ? 'B2B' : 'B2C'

  // Company name: prefer the custom_field, fall back to cardholder name.
  const companyName =
    getCustomFieldValue(session.custom_fields, 'company_name') ||
    customerDetails.name ||
    'Unknown'

  const amountMinor = (session.amount_total as number) ?? 0
  const currency = ((session.currency ?? 'ron') as string).toUpperCase()
  const now = new Date()
  const date = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const dateYearMonth = now.toISOString().slice(0, 7) // YYYY-MM

  const invoiceId = generateInvoiceId()

  // ---- Write billing record ----------------------------------------
  if (billingTable) {
    const billingRecord: BillingRecord = {
      invoiceId,
      stripeSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
      date,
      dateYearMonth,
      amountMinor,
      currency,
      customerType,
      fullName: customerDetails.name ?? companyName,
      email: customerDetails.email ?? '',
      companyName,
      vatId,
      vatIdVerified,
      country,
      fullAddress: formatAddress(billingAddress),
      userId,
      packageId,
      quantity,
      createdAt: Date.now(),
    }

    try {
      // Conditional put so a concurrent duplicate webhook doesn't overwrite.
      await putItem(billingTable, billingRecord, 'attribute_not_exists(stripeSessionId)')
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        log.info('checkout.session.billing_record_already_exists', { sessionId })
        return
      }
      throw err
    }

    log.info('checkout.session.billing_record_written', {
      sessionId,
      invoiceId,
      customerType,
      country,
      vatIdVerified,
    })
  }

  // ---- Write order record (idempotency guard for payment_intent.succeeded)
  if (paymentIntentId) {
    const orderRecord = {
      orderId: paymentIntentId,
      userId,
      amount: amountMinor,
      currency,
      packageId,
      status: 'PAID',
      paymentProvider: 'stripe',
      createdAt: now.toISOString(),
      invoiceStatus: 'pending' as const,
      invoiceSnapshot: {
        companyName,
        cui: vatId ?? '',
        country,
        city: billingAddress.city ?? '',
        street: billingAddress.line1 ?? '',
        postalCode: billingAddress.postal_code ?? '',
        billingEmail: customerDetails.email ?? '',
      },
      type: 'credit_bundle',
      quantity,
      checkoutSessionId: sessionId,
      invoiceId,
    }

    try {
      await putItem(env.ORDERS_TABLE, orderRecord, 'attribute_not_exists(orderId)')
    } catch (err: any) {
      if (err.name !== 'ConditionalCheckFailedException') throw err
      // Order already exists (from verifyPayment or a previous run) — skip.
      log.info('checkout.session.order_already_exists', { sessionId, paymentIntentId })
    }
  }

  // ---- Credit user -------------------------------------------------
  try {
    if (packageId === 'extra_event') {
      await updateItem(
        env.USERS_TABLE,
        { userId },
        'set eventCredits = if_not_exists(eventCredits, :zero) + :inc',
        { ':zero': 0, ':inc': quantity },
      )
    } else {
      const pkg = (PACKAGES as any)[packageId]
      if (pkg) {
        const creditsToAdd = (pkg.credits ?? 0) * quantity
        await updateItem(
          env.USERS_TABLE,
          { userId },
          'set eventCredits = if_not_exists(eventCredits, :zero) + :inc, subscriptionStatus = :status, #p = :plan',
          { ':zero': 0, ':inc': creditsToAdd, ':status': 'active', ':plan': packageId },
          { '#p': 'plan' },
        )
      }
    }
    log.info('checkout.session.credits_applied', { sessionId, userId, packageId, quantity })
  } catch (creditErr) {
    log.error('checkout.session.credit_failed', {
      sessionId,
      err: (creditErr as Error).message,
    })
    emitMetric('CreditApplyFailed', 1, 'Count')
    // Don't rethrow — billing record is written, ops can reconcile credits.
  }

  emitMetric('CheckoutSessionCompleted', 1, 'Count', { customerType, country })
}
