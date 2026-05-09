import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTablePage } from '../../src/utils/dynamodb'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

const MAX_ITEMS = 2000

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) return errorResponse('Authorization header is required', 401)
        const payload = verifyAuthHeader(authHeader)
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403)

        const env = getEnv()

        await enforceRateLimit({
            endpoint: 'admin:users',
            identity: rateLimitIdentity(event),
            max: 10,
            windowSec: 60,
        })

        const { items: users } = await scanTablePage({ tableName: env.USERS_TABLE, limit: MAX_ITEMS })
        const { items: events } = await scanTablePage({ tableName: env.EVENTS_TABLE, limit: MAX_ITEMS })

        const userEventCounts: Record<string, number> = {}
        events.forEach((e: any) => {
            userEventCounts[e.userId] = (userEventCounts[e.userId] || 0) + 1
        })

        const enrichedUsers = users.map((u: any) => ({
            userId: u.userId,
            email: u.email,
            name: u.name || 'N/A',
            role: u.role || 'user',
            subscriptionStatus: u.subscriptionStatus || 'inactive',
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            eventCount: userEventCounts[u.userId] || 0,
            credits: u.eventCredits || 0,
        }))

        enrichedUsers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return successResponse(enrichedUsers)
    } catch (error: any) {
        console.error('Error getting admin users:', error)
        return errorResponse(error.message || 'Failed to list users', 500)
    }
}
