import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse, preflightResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { updateItem, deleteItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const requestOrigin = event.headers?.origin ?? event.headers?.Origin
    if (event.httpMethod === 'OPTIONS') return preflightResponse(requestOrigin)
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401, { requestOrigin });
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403, { requestOrigin });

        const env = getEnv()
        const USERS_TABLE = env.USERS_TABLE

        await enforceRateLimit({
            endpoint: 'admin:manage-user',
            identity: rateLimitIdentity(event),
            max: 20,
            windowSec: 60,
        })

        if (!event.body) {
            return errorResponse('Missing body', 400, { requestOrigin })
        }

        const { userId, action, payload: actionPayload, confirm } = JSON.parse(event.body)

        if (!userId || !action) {
            return errorResponse('userId and action are required', 400, { requestOrigin })
        }

        switch (action) {
            case 'suspend':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'suspended' })
                await logAdminAction(payload.userId, 'suspend_user', { targetUserId: userId })
                return successResponse({ message: 'User suspended' }, 200, { requestOrigin })

            case 'activate':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'active' })
                await logAdminAction(payload.userId, 'activate_user', { targetUserId: userId })
                return successResponse({ message: 'User activated' }, 200, { requestOrigin })

            case 'add_credits': {
                const amount = parseInt(String(actionPayload?.amount), 10)
                if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
                    return errorResponse('amount must be a positive integer ≤ 10000', 400, { requestOrigin })
                }
                await updateItem(
                    USERS_TABLE,
                    { userId },
                    'SET eventCredits = if_not_exists(eventCredits, :zero) + :val',
                    { ':zero': 0, ':val': amount }
                )
                await logAdminAction(payload.userId, 'add_credits', { targetUserId: userId, amount })
                return successResponse({ message: 'Credits added' }, 200, { requestOrigin })
            }

            case 'delete':
                if (confirm !== true) {
                    return errorResponse('Pass confirm: true to permanently delete this user', 400, { requestOrigin })
                }
                await deleteItem(USERS_TABLE, { userId })
                await logAdminAction(payload.userId, 'delete_user', { targetUserId: userId })
                return successResponse({ message: 'User deleted' }, 200, { requestOrigin })

            default:
                return errorResponse('Invalid action', 400, { requestOrigin })
        }

    } catch (error: any) {
        console.error('Error managing user:', error)
        return errorResponse(error.message || 'Failed to manage user', 500, { requestOrigin })
    }
}
