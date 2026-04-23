import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as StripeConstructor from 'stripe'
import { successResponse, errorResponse } from '../../src/utils/response'
import { getItem, putItem, updateItem } from '../../src/utils/dynamodb'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { getEnv } from '../../src/config/env'
import { PACKAGES } from '../../src/constants/packages'

const Stripe = StripeConstructor as any

const ORDERS_TABLE = process.env.ORDERS_TABLE || ''
const USERS_TABLE = process.env.USERS_TABLE || ''

/**
 * POST /payment/verify
 *
 * UX smoother called by the frontend after Stripe redirects back. It verifies
 * the PaymentIntent status directly against the Stripe API, then eagerly
 * upserts the order + credits if the webhook hasn't arrived yet.
 *
 * The webhook remains authoritative. The conditional put ensures only one of
 * the two paths credits the user.
 */
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) return errorResponse('Authorization header is required', 401)

        const payload = verifyAuthHeader(authHeader)
        if (!payload) return errorResponse('Invalid or expired token', 401)

        const { userId } = payload

        if (!event.body) return errorResponse('Request body is required', 400)

        let body: {
            orderId?: string
            packageId?: string
            type?: string
            quantity?: number
            billingData?: any
        }
        try {
            body = JSON.parse(event.body)
        } catch {
            return errorResponse('Invalid JSON body', 400)
        }

        // amount is intentionally NOT accepted from the client — we fetch the
        // authoritative value from Stripe below.
        const { orderId, packageId, type, quantity = 1, billingData } = body

        if (!orderId) return errorResponse('orderId is required', 400)
        if (!packageId) return errorResponse('packageId is required', 400)

        if (!orderId.startsWith('pi_')) {
            return errorResponse('Invalid order id (expected a Stripe PaymentIntent id)', 400)
        }

        // Geo-restriction — only RO-originated payments for now.
        const { isFromRomania } = require('../../src/utils/geoRestriction')
        if (!isFromRomania(event)) {
            return errorResponse('Payments are currently restricted to Romania', 403)
        }

        // Idempotency: if the webhook already wrote the order, just echo it.
        const existingOrder = await getItem(ORDERS_TABLE, { orderId })

        if (existingOrder) {
            if (existingOrder.userId !== userId) {
                return errorResponse('Order does not belong to this user', 403)
            }

            if (existingOrder.status === 'PAID') {
                console.log(`[verifyPayment] Idempotent skip for orderId=${orderId}, already PAID`)
                return successResponse({
                    success: true,
                    alreadyProcessed: true,
                    message: 'Payment already processed',
                    orderId,
                    status: 'PAID',
                })
            }
        }

        // Verify the payment with Stripe directly — never trust client-provided
        // amounts or status. This closes the "fake pi_ id gets free credits" vector.
        const env = getEnv()
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

        let paymentIntent: any
        try {
            paymentIntent = await stripe.paymentIntents.retrieve(orderId)
        } catch (stripeErr: any) {
            console.error('[verifyPayment] Stripe retrieve failed:', stripeErr.message)
            return errorResponse('Payment not found', 404)
        }

        if (paymentIntent.status !== 'succeeded') {
            return errorResponse(`Payment has not succeeded (status: ${paymentIntent.status})`, 402)
        }

        // Ensure this PaymentIntent belongs to the authenticated user so one
        // user cannot claim another user's payment.
        const metaUserId = paymentIntent.metadata?.userId
        if (metaUserId && metaUserId !== userId) {
            console.warn(`[verifyPayment] userId mismatch: token=${userId} meta=${metaUserId} orderId=${orderId}`)
            return errorResponse('Order does not belong to this user', 403)
        }

        // Use Stripe's authoritative amount — not the client-supplied value.
        const amount = paymentIntent.amount as number
        const qty = parseInt(String(quantity)) || 1
        const createdAt = Date.now()

        if (!existingOrder) {
            const orderRecord = {
                orderId,
                userId,
                packageId,
                amount,
                currency: 'RON',
                status: 'PAID',
                invoiceStatus: 'pending',
                invoiceSnapshot: billingData || {},
                paymentProvider: 'stripe' as const,
                createdAt,
                type: type || 'credit_bundle',
                quantity: qty,
            }

            await putItem(
                ORDERS_TABLE,
                orderRecord,
                'attribute_not_exists(orderId)',
            )
        }

        // Credit the user.
        if (type === 'extra_event') {
            await updateItem(
                USERS_TABLE,
                { userId },
                'set eventCredits = if_not_exists(eventCredits, :zero) + :inc',
                { ':zero': 0, ':inc': qty }
            )
        } else {
            const packageDetails = (PACKAGES as any)[packageId]
            if (!packageDetails) {
                return errorResponse(`Unknown packageId: ${packageId}`, 400)
            }

            const totalCreditsToAdd = (packageDetails.credits || 0) * qty

            await updateItem(
                USERS_TABLE,
                { userId },
                'set eventCredits = if_not_exists(eventCredits, :zero) + :inc, subscriptionStatus = :status, #p = :plan',
                { ':zero': 0, ':inc': totalCreditsToAdd, ':status': 'active', ':plan': packageId },
                { '#p': 'plan' }
            )
        }

        console.log(`[verifyPayment] Payment verified and credits added for userId=${userId}, orderId=${orderId}, packageId=${packageId}, qty=${qty}, amount=${amount}`)

        return successResponse({
            success: true,
            alreadyProcessed: false,
            message: 'Payment verified and credits added',
            orderId,
            status: 'PAID',
        })

    } catch (error: any) {
        if (error?.name === 'ConditionalCheckFailedException') {
            console.log('[verifyPayment] Race condition: order already written by concurrent request')
            return successResponse({
                success: true,
                alreadyProcessed: true,
                message: 'Payment already processed (concurrent write)',
                status: 'PAID',
            })
        }

        console.error('[verifyPayment] Error:', error)
        return errorResponse(error.message || 'Failed to verify payment', 500)
    }
}
