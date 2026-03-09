import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { getItem } from '../../src/utils/dynamodb'

const SYSTEM_STATS_TABLE = process.env.SYSTEM_STATS_TABLE!
const SETTINGS_KEY = 'SYSTEM_SETTINGS'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
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
