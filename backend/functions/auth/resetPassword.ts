import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { queryItems, updateItem } from '../../src/utils/dynamodb'
import * as crypto from 'crypto'

const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Request body is required', 400)
        }

        const { token, newPassword } = JSON.parse(event.body)

        if (!token || !newPassword) {
            return errorResponse('Token and new password are required', 400)
        }

        // 1. Find user by reset token
        // Note: Since we don't have a resetToken-index, we iterate or query if we can.
        // Ideally we should have an index. Let's assume we do a scan or we pass the email in frontend to query.
        // For now, let's scan or assume we have the index 'resetToken-index'.
        const users = await queryItems(
            USERS_TABLE,
            'resetToken = :token',
            { ':token': token },
            'resetToken-index'
        )

        if (users.length === 0) {
            return errorResponse('Invalid or expired token', 400)
        }

        const user = users[0]

        // 2. Check Expiry
        if (user.resetTokenExpiry < Date.now()) {
            return errorResponse('Token has expired', 400)
        }

        // 3. Hash New Password
        const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex')

        // 4. Update Password and Clear Token
        await updateItem(
            USERS_TABLE,
            { userId: user.userId },
            'SET password = :pass, resetToken = :null, resetTokenExpiry = :null',
            { ':pass': passwordHash, ':null': null }
        )

        return successResponse({ message: 'Password has been reset successfully.' }, 200)
    } catch (error: any) {
        console.error('Error in resetPassword:', error)
        return errorResponse(error.message || 'Failed to reset password', 500)
    }
}
