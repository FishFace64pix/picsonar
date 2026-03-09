import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { putItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'

const SYSTEM_STATS_TABLE = process.env.SYSTEM_STATS_TABLE!
const SETTINGS_KEY = 'SYSTEM_SETTINGS'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Missing body', 400)
        }

        const newSettings = JSON.parse(event.body)

        // Validate fields if necessary
        // ...

        const settingsItem = {
            statsId: SETTINGS_KEY,
            updatedAt: Date.now(),
            ...newSettings
        }

        await putItem(SYSTEM_STATS_TABLE, settingsItem)

        await logAdminAction('admin', 'update_settings', newSettings)

        return successResponse({ message: 'Settings updated' })
    } catch (error: any) {
        console.error('Error updating settings:', error)
        return errorResponse(error.message || 'Failed to update settings', 500)
    }
}
