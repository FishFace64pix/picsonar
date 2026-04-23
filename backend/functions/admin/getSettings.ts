import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { getItem } from '../../src/utils/dynamodb'

const SYSTEM_STATS_TABLE = process.env.SYSTEM_STATS_TABLE!
const SETTINGS_KEY = 'SYSTEM_SETTINGS'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        const settings = await getItem(SYSTEM_STATS_TABLE, { statsId: SETTINGS_KEY })

        // Return defaults if not set
        const defaultSettings = {
            maintenanceMode: false,
            allowNewRegistrations: true,
            freeTierCredits: 5,
            maxPhotosPerEvent: 1000,
            globalAnnouncement: ''
        }

        return successResponse({ ...defaultSettings, ...settings })
    } catch (error: any) {
        console.error('Error getting settings:', error)
        return errorResponse(error.message || 'Failed to get settings', 500)
    }
}
