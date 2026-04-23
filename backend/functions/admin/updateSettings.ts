import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { z } from 'zod'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { putItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'

const SYSTEM_STATS_TABLE = process.env.SYSTEM_STATS_TABLE!
const SETTINGS_KEY = 'SYSTEM_SETTINGS'

const SettingsSchema = z.object({
    maintenanceMode: z.boolean().optional(),
    allowNewRegistrations: z.boolean().optional(),
    freeTierCredits: z.number().int().min(0).max(100).optional(),
    maxPhotosPerEvent: z.number().int().min(1).max(10000).optional(),
    globalAnnouncement: z.string().max(1000).optional(),
}).strict() // reject unknown keys

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

        let raw: unknown
        try {
            raw = JSON.parse(event.body)
        } catch {
            return errorResponse('Invalid JSON body', 400)
        }

        const parsed = SettingsSchema.safeParse(raw)
        if (!parsed.success) {
            return errorResponse(`Invalid settings: ${parsed.error.issues.map(i => i.message).join(', ')}`, 400)
        }

        const newSettings = parsed.data

        const settingsItem = {
            statsId: SETTINGS_KEY,
            updatedAt: Date.now(),
            updatedBy: payload.userId,
            ...newSettings
        }

        await putItem(SYSTEM_STATS_TABLE, settingsItem)

        await logAdminAction(payload.userId, 'update_settings', newSettings)

        return successResponse({ message: 'Settings updated' })
    } catch (error: any) {
        console.error('Error updating settings:', error)
        return errorResponse(error.message || 'Failed to update settings', 500)
    }
}
