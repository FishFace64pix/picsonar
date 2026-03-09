import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../src/utils/response'
import { putItem } from '../src/utils/dynamodb'
import { v4 as uuidv4 } from 'uuid'

const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Request body is required', 400)
        }

        const { eventId, consentType, accepted } = JSON.parse(event.body)

        if (!eventId || !consentType || typeof accepted !== 'boolean') {
            return errorResponse('EventId, consentType, and accepted status are required', 400)
        }

        const ip = event.requestContext?.identity?.sourceIp || 'unknown'
        const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || 'unknown'

        const logEntry = {
            logId: uuidv4(),
            timestamp: Date.now(),
            type: 'GUEST_CONSENT_ACTION',
            eventId,
            consentType,
            accepted,
            metadata: {
                ip,
                userAgent,
                version: '1.0'
            }
        }

        await putItem(AUDIT_LOGS_TABLE, logEntry)

        return successResponse({ success: true, logId: logEntry.logId })
    } catch (error: any) {
        console.error('Error logging consent:', error)
        return errorResponse(error.message || 'Failed to log consent', 500)
    }
}
