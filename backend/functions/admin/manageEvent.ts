import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { updateItem, deleteItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'

const EVENTS_TABLE = process.env.EVENTS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Missing body', 400)
        }

        const { eventId, action } = JSON.parse(event.body)

        if (!eventId || !action) {
            return errorResponse('eventId and action are required', 400)
        }

        switch (action) {
            case 'close_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'closed' }, { '#s': 'status' })
                return successResponse({ message: 'Event closed' })

            case 'open_event':
                await updateItem(EVENTS_TABLE, { eventId }, 'SET #s = :status', { ':status': 'active' }, { '#s': 'status' })
                return successResponse({ message: 'Event activated' })

            case 'delete_event':
                // IMPORTANT: In a real app, this should trigger a cleanup of S3 photos and DynamoDB items (photos, faces).
                // For MVP Admin, we will just delete the event record. The photos will unfortunately stay orphaned in S3 
                // until we implement a proper cleanup job or S3 lifecycle.
                await deleteItem(EVENTS_TABLE, { eventId })
                return successResponse({ message: 'Event deleted' })

            default:
                return errorResponse('Invalid action', 400)
        }

    } catch (error: any) {
        console.error('Error managing event:', error)
        return errorResponse(error.message || 'Failed to manage event', 500)
    }
}
