import { putItem } from './dynamodb'
import { v4 as uuidv4 } from 'uuid'

const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE!

export const logAdminAction = async (
    adminId: string,
    action: string,
    details: Record<string, any>,
    status: 'success' | 'failure' = 'success'
) => {
    try {
        if (!AUDIT_LOGS_TABLE) {
            console.warn('AUDIT_LOGS_TABLE not defined, skipping log')
            return
        }

        const logId = uuidv4()
        const timestamp = Date.now()

        await putItem(AUDIT_LOGS_TABLE, {
            logId,
            timestamp,
            adminId, // For now, this might be 'system' or the cognito sub if available
            action,
            details,
            status,
            ttl: Math.floor(timestamp / 1000) + (60 * 60 * 24 * 30), // 30 days retention
            dateIso: new Date(timestamp).toISOString()
        })
    } catch (error) {
        console.error('Failed to write audit log:', error)
        // Ensure we don't block the main flow if logging fails
    }
}
