import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { updateItem, deleteItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        const env = getEnv()
        const EVENTS_TABLE = env.EVENTS_TABLE

        await enforceRateLimit({
            endpoint: 'admin:manage-event',
            identity: rateLimitIdentity(event),
            max: 20,
            windowSec: 60,
        })

        if (!event.body) {
            return errorResponse('Missing body', 400)
        }

        const { eventId, action, confirm } = JSON.parse(event.body)

        if (!eventId || !action) {
            return errorResponse('eventId and action are required', 400)
        }

        switch (action) {
            case 'close_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'closed' }, { '#s': 'status' })
                await logAdminAction(payload.userId, 'close_event', { eventId })
                return successResponse({ message: 'Event closed' })

            case 'open_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'active' }, { '#s': 'status' })
                await logAdminAction(payload.userId, 'open_event', { eventId })
                return successResponse({ message: 'Event activated' })

            case 'delete_event':
                // Require explicit confirmation to prevent accidental permanent deletion.
                // Note: orphaned S3 photos and face records require a separate cleanup job.
                if (confirm !== true) {
                    return errorResponse('Pass confirm: true to permanently delete this event', 400)
                }
                await deleteItem(EVENTS_TABLE, { eventId })
                await logAdminAction(payload.userId, 'delete_event', { eventId })
                return successResponse({ message: 'Event deleted' })

            default:
                return errorResponse('Invalid action', 400)
        }

    } catch (error: any) {
        console.error('Error managing event:', error)
        return errorResponse(error.message || 'Failed to manage event', 500)
    }
}
