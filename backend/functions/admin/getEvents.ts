import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse, preflightResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTablePage } from '../../src/utils/dynamodb'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

const MAX_ITEMS = 2000

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

        await enforceRateLimit({
            endpoint: 'admin:events',
            identity: rateLimitIdentity(event),
            max: 10,
            windowSec: 60,
        })

        const { items: events } = await scanTablePage({ tableName: env.EVENTS_TABLE, limit: MAX_ITEMS })
        const { items: users } = await scanTablePage({ tableName: env.USERS_TABLE, limit: MAX_ITEMS })

        const userMap: Record<string, string> = {}
        users.forEach((u: any) => {
            userMap[u.userId] = u.name || u.email || 'Unknown'
        })

        const enrichedEvents = events.map((e: any) => {
            const photoCount = e.totalPhotos || 0
            const storageMB = e.totalSizeBytes
                ? e.totalSizeBytes / (1024 * 1024)
                : photoCount * 2

            return {
                eventId: e.eventId,
                name: e.eventName,
                ownerId: e.userId,
                ownerName: userMap[e.userId] || 'Unknown',
                status: e.status || 'active',
                date: e.createdAt,
                photoCount,
                faceCount: e.totalFaces || 0,
                storageMB,
            }
        })

        enrichedEvents.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return successResponse(enrichedEvents, 200, { requestOrigin })
    } catch (error: any) {
        console.error('Error getting admin events:', error)
        return errorResponse(error.message || 'Failed to list events', 500, { requestOrigin })
    }
}
