import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse, preflightResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTablePage } from '../../src/utils/dynamodb'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const requestOrigin = event.headers?.origin ?? event.headers?.Origin
    if (event.httpMethod === 'OPTIONS') return preflightResponse(requestOrigin)
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) return errorResponse('Authorization header is required', 401, { requestOrigin })
        const payload = verifyAuthHeader(authHeader)
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403, { requestOrigin })

        const env = getEnv()
        const AUDIT_LOGS_TABLE = (env as any).AUDIT_LOGS_TABLE as string | undefined
        if (!AUDIT_LOGS_TABLE) return successResponse([], 200, { requestOrigin })

        await enforceRateLimit({
            endpoint: 'admin:logs',
            identity: rateLimitIdentity(event),
            max: 10,
            windowSec: 60,
        })

        const { items: logs } = await scanTablePage({ tableName: AUDIT_LOGS_TABLE, limit: 500 })

        logs.sort((a: any, b: any) => b.timestamp - a.timestamp)

        return successResponse(logs.slice(0, 100), 200, { requestOrigin })
    } catch (error: any) {
        console.error('Error getting audit logs:', error)
        return errorResponse(error.message || 'Failed to get logs', 500, { requestOrigin })
    }
}
