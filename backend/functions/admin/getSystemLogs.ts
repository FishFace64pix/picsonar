import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { scanTable } from '../../src/utils/dynamodb'

const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // 1. Get logs
        // Ideally use Query on GSI date-index for pagination.
        // For MVP Admin, Scan is fine.
        const logs = await scanTable(AUDIT_LOGS_TABLE)

        // Sort by timestamp desc
        logs.sort((a: any, b: any) => b.timestamp - a.timestamp)

        // Limit to last 100
        const recentLogs = logs.slice(0, 100)

        return successResponse(recentLogs)
    } catch (error: any) {
        console.error('Error getting audit logs:', error)
        return errorResponse(error.message || 'Failed to get logs', 500)
    }
}
