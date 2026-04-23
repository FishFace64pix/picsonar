import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { updateItem, deleteItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'

const USERS_TABLE = process.env.USERS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        if (!event.body) {
            return errorResponse('Missing body', 400)
        }

        const { userId, action, payload: actionPayload, confirm } = JSON.parse(event.body)

        if (!userId || !action) {
            return errorResponse('userId and action are required', 400)
        }

        switch (action) {
            case 'suspend':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'suspended' })
                await logAdminAction(payload.userId, 'suspend_user', { targetUserId: userId })
                return successResponse({ message: 'User suspended' })

            case 'activate':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'active' })
                await logAdminAction(payload.userId, 'activate_user', { targetUserId: userId })
                return successResponse({ message: 'User activated' })

            case 'add_credits': {
                const amount = parseInt(String(actionPayload?.amount), 10)
                if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
                    return errorResponse('amount must be a positive integer ≤ 10000', 400)
                }
                await updateItem(
                    USERS_TABLE,
                    { userId },
                    'SET eventCredits = if_not_exists(eventCredits, :zero) + :val',
                    { ':zero': 0, ':val': amount }
                )
                await logAdminAction(payload.userId, 'add_credits', { targetUserId: userId, amount })
                return successResponse({ message: 'Credits added' })
            }

            case 'delete':
                // Require explicit confirmation to prevent accidental permanent deletion.
                if (confirm !== true) {
                    return errorResponse('Pass confirm: true to permanently delete this user', 400)
                }
                await deleteItem(USERS_TABLE, { userId })
                await logAdminAction(payload.userId, 'delete_user', { targetUserId: userId })
                return successResponse({ message: 'User deleted' })

            default:
                return errorResponse('Invalid action', 400)
        }

    } catch (error: any) {
        console.error('Error managing user:', error)
        return errorResponse(error.message || 'Failed to manage user', 500)
    }
}
