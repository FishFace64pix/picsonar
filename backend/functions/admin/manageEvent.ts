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
        const EVENTS_TABLE = env.EVENTS_TABLE

        await enforceRateLimit({
            endpoint: 'admin:manage-event',
            identity: rateLimitIdentity(event),
            max: 20,
            windowSec: 60,
        })

        if (!event.body) {
            return errorResponse('Missing body', 400, { requestOrigin })
        }

        const { eventId, action, confirm } = JSON.parse(event.body)

        if (!eventId || !action) {
            return errorResponse('eventId and action are required', 400, { requestOrigin })
        }

        switch (action) {
            case 'close_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'closed' }, { '#s': 'status' })
                await logAdminAction(payload.userId, 'close_event', { eventId })
                return successResponse({ message: 'Event closed' }, 200, { requestOrigin })

            case 'open_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'active' }, { '#s': 'status' })
                await logAdminAction(payload.userId, 'open_event', { eventId })
                return successResponse({ message: 'Event activated' }, 200, { requestOrigin })

            case 'delete_event':
                if (confirm !== true) {
                    return errorResponse('Pass confirm: true to permanently delete this event', 400, { requestOrigin })
                }
                await deleteItem(EVENTS_TABLE, { eventId })
                await logAdminAction(payload.userId, 'delete_event', { eventId })
                return successResponse({ message: 'Event deleted' }, 200, { requestOrigin })

            default:
                return errorResponse('Invalid action', 400, { requestOrigin })
        }

    } catch (error: any) {
        console.error('Error managing event:', error)
        return errorResponse(error.message || 'Failed to manage event', 500, { requestOrigin })
    }
}
