import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { updateItem, putItem, getItem } from '../../src/utils/dynamodb'
import Stripe from 'stripe'
import { PACKAGES } from '../../src/constants/packages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const USERS_TABLE = process.env.USERS_TABLE || ''
const ORDERS_TABLE = process.env.ORDERS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Verify Payment Event Body:', event.body)
        if (!event.body) {
            console.error('Missing body')
            return errorResponse('Request body is required', 400)
        }

        const { paymentIntentId } = JSON.parse(event.body)
        console.log('PaymentIntentID:', paymentIntentId)

        if (!paymentIntentId) {
            console.error('Missing PaymentIntentId')
            return errorResponse('PaymentIntentId is required', 400)
        }

        // ========== IDEMPOTENCY CHECK ==========
        // If order already exists and was processed, skip credit update
        const existingOrder = await getItem(ORDERS_TABLE, { orderId: paymentIntentId })
        if (existingOrder) {
            console.log('Order already processed (idempotency guard):', paymentIntentId)
            const packageDetails = existingOrder.packageId ? (PACKAGES as any)[existingOrder.packageId] : null
            return successResponse({ success: true, alreadyProcessed: true, package: packageDetails || { id: existingOrder.packageId } })
        }
        // ========================================

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        console.log('Retrieved Intent:', JSON.stringify(paymentIntent))

        if (paymentIntent.status !== 'succeeded') {
            console.error('Payment status inaccurate:', paymentIntent.status)
            return errorResponse('Payment not successful', 400)
        }

        const { userId, packageId, type } = paymentIntent.metadata
        console.log('Metadata:', { userId, packageId, type })

        if (!userId || !packageId) {
            console.error('Missing metadata')
            return errorResponse('Invalid payment metadata', 400)
        }

        // Get package details (only if not extra event)
        let packageDetails = null
        const qty = parseInt(paymentIntent.metadata.quantity || '1') || 1

        if (type !== 'extra_event') {
            packageDetails = (PACKAGES as any)[packageId]
            if (!packageDetails) {
                console.error('Unknown package:', packageId)
                return errorResponse('Unknown package', 400)
            }
        }

        if (type === 'extra_event') {
            await updateItem(USERS_TABLE, { userId },
                'set eventCredits = if_not_exists(eventCredits, :zero) + :inc',
                { ':zero': 0, ':inc': qty }
            )
        } else {
            console.log('Processing credit bundle for user:', userId, 'Package:', packageId, 'Quantity:', qty)
            const creditsPerBundle = packageDetails!.credits || 0
            const totalCreditsToAdd = creditsPerBundle * qty

            // Atomic Credit Increment and Plan Update
            await updateItem(USERS_TABLE, { userId },
                'set eventCredits = if_not_exists(eventCredits, :zero) + :inc, subscriptionStatus = :status, #p = :plan',
                {
                    ':zero': 0,
                    ':inc': totalCreditsToAdd,
                    ':status': 'active',
                    ':plan': packageId
                },
                { '#p': 'plan' }
            )
        }

        console.log('DB Update Successful (Credits Added)')

        // Create Order Record if not exists
        const orderId = paymentIntent.id
        await putItem(ORDERS_TABLE, {
            orderId,
            userId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            packageId,
            status: 'PAID',
            createdAt: new Date().toISOString(),
            paymentIntentId
        })
        console.log('Order Created')

        return successResponse({ success: true, package: packageDetails || { id: 'extra_event' } })

    } catch (error: any) {
        console.error('Error verifying payment:', error)
        return errorResponse(error.message || 'Failed to verify payment', 500)
    }
}
