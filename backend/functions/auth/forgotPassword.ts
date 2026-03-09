import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { queryItems, updateItem } from '../../src/utils/dynamodb'
import { sendResetPasswordEmail } from '../../src/utils/email'
import * as crypto from 'crypto'

const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Request body is required', 400)
        }

        const { email } = JSON.parse(event.body)

        if (!email) {
            return errorResponse('Email is required', 400)
        }

        // 1. Find user
        const users = await queryItems(
            USERS_TABLE,
            'email = :email',
            { ':email': email },
            'email-index'
        )

        if (users.length === 0) {
            return successResponse({ message: 'If an account exists, a reset link has been sent.' }, 200)
        }

        const user = users[0]

        // 2. Generate Random Token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = Date.now() + 3600000 // 1 hour

        // 3. Save Token to Database
        await updateItem(
            USERS_TABLE,
            { userId: user.userId },
            'SET resetToken = :token, resetTokenExpiry = :expiry',
            { ':token': resetToken, ':expiry': resetTokenExpiry }
        )

        // 4. Send Real Email via SES
        try {
            await sendResetPasswordEmail(email, resetToken);
        } catch (mailError) {
            console.error("Email delivery failed:", mailError);

            // If in dev/test, allow the process to continue with a fallback message
            if (process.env.STAGE === 'dev' || process.env.VITE_USE_MOCK === 'true') {
                return successResponse({
                    message: 'Email delivery failed (likely SES verification), but you can use this token for testing.',
                    _devToken: resetToken
                }, 200)
            }
            throw mailError;
        }

        return successResponse({
            message: 'If an account exists, a reset link has been sent.'
        }, 200)
    } catch (error: any) {
        console.error('Error in forgotPassword:', error)
        return errorResponse(error.message || 'Failed to process request', 500)
    }
}
