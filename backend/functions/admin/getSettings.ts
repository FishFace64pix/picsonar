import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse, preflightResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { getItem } from '../../src/utils/dynamodb'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

const SETTINGS_KEY = 'SYSTEM_SETTINGS'

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
        const SYSTEM_STATS_TABLE = (env as any).SYSTEM_STATS_TABLE as string | undefined
        if (!SYSTEM_STATS_TABLE) return successResponse({ maintenanceMode: false, allowNewRegistrations: true, freeTierCredits: 5, maxPhotosPerEvent: 1000, globalAnnouncement: '' }, 200, { requestOrigin })

        await enforceRateLimit({
            endpoint: 'admin:settings-read',
            identity: rateLimitIdentity(event),
            max: 20,
            windowSec: 60,
        })

        const settings = await getItem(SYSTEM_STATS_TABLE, { statsId: SETTINGS_KEY })

        // Return defaults if not set
        const defaultSettings = {
            maintenanceMode: false,
            allowNewRegistrations: true,
            freeTierCredits: 5,
            maxPhotosPerEvent: 1000,
            globalAnnouncement: ''
        }

        return successResponse({ ...defaultSettings, ...settings }, 200, { requestOrigin })
    } catch (error: any) {
        console.error('Error getting settings:', error)
        return errorResponse(error.message || 'Failed to get settings', 500, { requestOrigin })
    }
}
