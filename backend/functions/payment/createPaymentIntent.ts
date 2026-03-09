import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { getItem } from '../../src/utils/dynamodb'
import { validateCUI } from '../../src/utils/validateCUI'
import { verifyAuthHeader } from '../../src/utils/jwt'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Auth check
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) {
            return errorResponse('Authorization header is required', 401)
        }

        // Verify JWT and extract userId
        const payload = verifyAuthHeader(authHeader)
        if (!payload) {
            return errorResponse('Invalid or expired token', 401)
        }

        const { userId } = payload

        if (!event.body) {
            return errorResponse('Request body is required', 400)
        }

        const { packageId, type, quantity = 1, billingData } = JSON.parse(event.body)

        // ========== BILLING DATA VALIDATION (MANDATORY FOR B2B) ==========

        if (!billingData) {
            return errorResponse('Billing data is required for all purchases', 400)
        }

        // Validate required fields
        const requiredFields = [
            'companyName',
            'cui',
            'country',
            'city',
            'street',
            'postalCode',
            'billingEmail'
        ]

        for (const field of requiredFields) {
            if (!billingData[field] || !billingData[field].trim()) {
                return errorResponse(`Missing required billing field: ${field}`, 400)
            }
        }

        // Validate CUI (HARD ENFORCEMENT - Backend validation)
        const cuiValidation = validateCUI(billingData.cui)
        if (!cuiValidation.valid) {
            console.error('CUI validation failed:', cuiValidation.error, 'Input:', billingData.cui)
            return errorResponse(
                `Invalid CUI: ${cuiValidation.error || 'checksum validation failed'}`,
                400
            )
        }

        // Validate email format
        if (!EMAIL_REGEX.test(billingData.billingEmail)) {
            return errorResponse('Invalid email format', 400)
        }

        // Validate min lengths
        if (billingData.companyName.trim().length < 2) {
            return errorResponse('Company name must be at least 2 characters', 400)
        }

        console.log('Billing data validated successfully for user:', userId)

        // ========== PACKAGE & PRICING ==========

        let amount = 0
        let currency = 'ron'
        let description = ''

        if (type === 'extra_event') {
            // Fetch user to know their active plan
            const USERS_TABLE = process.env.USERS_TABLE || ''
            const user = await getItem(USERS_TABLE, { userId })
            const activePlan = user?.plan || 'starter'

            // Prices are in bani (1 RON = 100 bani)
            // Prices per credit:
            // starter: 120 (5), 100 (10), 90 (15)
            // studio: 210 (5), 195 (10), 185 (15)
            // agency: 550 (5), 500 (10), 475 (15)

            if (activePlan === 'starter') {
                switch (packageId) {
                    case 'extra_5': amount = 60000; break; // 600 RON
                    case 'extra_10': amount = 100000; break; // 1000 RON
                    case 'extra_15': amount = 135000; break; // 1350 RON
                    default: amount = 60000;
                }
            } else if (activePlan === 'studio') {
                switch (packageId) {
                    case 'extra_5': amount = 105000; break; // 1050 RON
                    case 'extra_10': amount = 195000; break; // 1950 RON
                    case 'extra_15': amount = 277500; break; // 2775 RON
                    default: amount = 105000;
                }
            } else if (activePlan === 'agency') {
                switch (packageId) {
                    case 'extra_5': amount = 275000; break; // 2750 RON
                    case 'extra_10': amount = 500000; break; // 5000 RON
                    case 'extra_15': amount = 712500; break; // 7125 RON
                    default: amount = 275000;
                }
            } else {
                // Fallback (e.g. no active plan)
                switch (packageId) {
                    case 'extra_5': amount = 60000; break;
                    case 'extra_10': amount = 100000; break;
                    case 'extra_15': amount = 135000; break;
                    default: amount = 60000;
                }
            }
            description = `Extra Event Credits Bundle (${activePlan} plan)`
        } else {
            switch (packageId) {
                case 'starter':
                    amount = 14900 // 149.00 RON
                    description = 'Starter Plan (1 Event)'
                    break
                case 'studio':
                    amount = 79900 // 799.00 RON
                    description = 'Studio Plan (4 Events)'
                    break
                case 'agency':
                    amount = 249900 // 2499.00 RON
                    description = 'Agency Plan (12 Events)'
                    break
                default:
                    return errorResponse('Invalid package selected', 400)
            }
        }

        const qty = parseInt(quantity) || 1
        if (qty < 1) {
            return errorResponse('Quantity must be at least 1', 400)
        }

        const totalAmount = amount * qty

        // ========== CREATE PAYMENT INTENT WITH BILLING DATA ==========

        // Normalize billing data for storage
        const normalizedBillingData = {
            companyName: billingData.companyName.trim(),
            cui: cuiValidation.normalized, // Store normalized (digits only)
            hasROPrefix: cuiValidation.hasROPrefix,
            vatPayer: billingData.vatPayer || false,
            country: billingData.country.trim(),
            city: billingData.city.trim(),
            street: billingData.street.trim(),
            postalCode: billingData.postalCode.trim(),
            billingEmail: billingData.billingEmail.trim().toLowerCase(),
            regCom: billingData.regCom?.trim() || '',
            bank: billingData.bank?.trim() || '',
            iban: billingData.iban?.trim() || ''
        }

        // Create PaymentIntent with billing data in metadata
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId,
                packageId,
                type: type || 'credit_bundle',
                quantity: qty.toString(),
                // Store billing data as JSON string (Stripe metadata limitation)
                billingData: JSON.stringify(normalizedBillingData)
            },
            description: `${description} ${qty > 1 ? `(x${qty})` : ''} - ${normalizedBillingData.companyName}`,
            receipt_email: normalizedBillingData.billingEmail
        })

        console.log('PaymentIntent created successfully:', paymentIntent.id)

        return successResponse({
            clientSecret: paymentIntent.client_secret,
        })

    } catch (error: any) {
        console.error('Error creating payment intent:', error)
        return errorResponse(error.message || 'Failed to create payment intent', 500)
    }
}
