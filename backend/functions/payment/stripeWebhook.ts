import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../src/utils/response';
import { putItem, getItem, updateItem } from '../../src/utils/dynamodb';
import Stripe from 'stripe';
import { PACKAGES } from '../../src/constants/packages';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const ORDERS_TABLE = process.env.ORDERS_TABLE || '';
const USERS_TABLE = process.env.USERS_TABLE || '';

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Verify Stripe signature
        const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

        if (!signature || !event.body) {
            console.error('Missing signature or body');
            return errorResponse('Missing signature or body', 400);
        }

        let stripeEvent: Stripe.Event;
        try {
            stripeEvent = stripe.webhooks.constructEvent(
                event.body,
                signature,
                WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            return errorResponse(`Webhook Error: ${err.message}`, 400);
        }

        console.log('Webhook event type:', stripeEvent.type);

        // Handle payment_intent.succeeded
        if (stripeEvent.type === 'payment_intent.succeeded') {
            const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

            await handlePaymentSuccess(paymentIntent);
        }

        return successResponse({ received: true });

    } catch (error: any) {
        console.error('Webhook handler error:', error);
        return errorResponse(error.message || 'Webhook processing failed', 500);
    }
};

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const orderId = paymentIntent.id;
    const { userId, packageId, billingData, type, quantity } = paymentIntent.metadata;
    const qty = parseInt(quantity || '1') || 1;

    console.log('Processing payment success:', { orderId, userId, packageId, type, qty });

    // ========== IDEMPOTENCY CHECK ==========
    // Check if order already exists and has been processed
    const existingOrder = await getItem(ORDERS_TABLE, { orderId });

    if (existingOrder && existingOrder.invoiceStatus !== 'pending') {
        console.log('Order already processed (idempotent skip):', orderId);
        return; // Skip processing - webhook retry
    }

    // Parse billing data from metadata
    const parsedBillingData = JSON.parse(billingData);

    // ========== CREATE ORDER WITH INVOICE SNAPSHOT ==========
    const order = {
        orderId,
        userId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        packageId,
        status: 'PAID',
        paymentIntentId: paymentIntent.id,
        createdAt: new Date().toISOString(),

        // IMMUTABLE invoice snapshot
        invoiceSnapshot: parsedBillingData,

        // Initial invoice status
        invoiceStatus: 'pending' as const,
    };

    // Save order (if not exists from idempotency check)
    if (!existingOrder) {
        await putItem(ORDERS_TABLE, order);
        console.log('Order created:', orderId);
    }

    // ========== UPDATE USER CREDITS ==========
    if (type === 'extra_event') {
        await updateItem(
            USERS_TABLE,
            { userId },
            'set eventCredits = if_not_exists(eventCredits, :zero) + :inc',
            {
                ':zero': 0,
                ':inc': qty
            }
        );
        console.log('User extra event credits added:', userId, `+${qty}`);
    } else {
        // Get package details
        const packageDetails = (PACKAGES as any)[packageId];
        if (packageDetails) {
            const creditsPerBundle = packageDetails.credits || 0;
            const totalCreditsToAdd = creditsPerBundle * qty;

            await updateItem(
                USERS_TABLE,
                { userId },
                'set eventCredits = if_not_exists(eventCredits, :zero) + :inc, subscriptionStatus = :status, #p = :plan',
                {
                    ':zero': 0,
                    ':inc': totalCreditsToAdd,
                    ':status': 'active',
                    ':plan': packageId
                },
                { '#p': 'plan' }
            );
            console.log('User bundle credits updated:', userId, `+${totalCreditsToAdd}`);
        }
    }

    // ========== INVOICE GENERATION (PLACEHOLDER) ==========
    // TODO: Implement actual invoice generation
    // For now, mark as pending - manual invoice generation or future integration
    try {
        // Future: Call generateInvoice utility here
        // const invoiceResult = await generateInvoice({ ... });

        // For now: Mark invoice as pending
        await updateItem(
            ORDERS_TABLE,
            { orderId },
            'set invoiceStatus = :status',
            {
                ':status': 'pending'
            }
        );

        console.log('Order marked with pending invoice status:', orderId);

        // TODO: In production, integrate with SmartBill/Oblio or implement PDF generation
        // Then update order with: invoiceNumber, invoicePdfUrl, invoiceProvider, invoiceIssuedAt

    } catch (invoiceError: any) {
        console.error('Invoice processing error:', invoiceError);
        await updateItem(
            ORDERS_TABLE,
            { orderId },
            'set invoiceStatus = :status, invoiceErrorMessage = :error',
            {
                ':status': 'failed',
                ':error': invoiceError.message
            }
        );
    }
}
