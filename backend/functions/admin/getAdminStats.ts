import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTablePage } from '../../src/utils/dynamodb'
import { enforceRateLimit, rateLimitIdentity } from '../../src/middleware/rateLimit'
import { getEnv } from '../../src/config/env'

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        const env = getEnv()
        const USERS_TABLE = env.USERS_TABLE
        const EVENTS_TABLE = env.EVENTS_TABLE
        const ORDERS_TABLE = env.ORDERS_TABLE

        await enforceRateLimit({
            endpoint: 'admin:stats',
            identity: rateLimitIdentity(event),
            max: 10,
            windowSec: 60,
        })

        // Scans are capped at 2 000 items each to prevent Lambda timeout / DynamoDB
        // throttling at scale. For exact counts, migrate to a SystemStatsTable approach.
        const MAX_ITEMS = 2000

        // 1. Get Users Stats
        const { items: users } = await scanTablePage({ tableName: USERS_TABLE, limit: MAX_ITEMS })
        const totalUsers = users.length
        const activeSubs = users.filter((u: any) => u.subscriptionStatus === 'active').length

        // 2. Get Events Stats
        const { items: eventsList } = await scanTablePage({ tableName: EVENTS_TABLE, limit: MAX_ITEMS })
        const totalEvents = eventsList.length
        const activeEvents = eventsList.filter((e: any) => e.status === 'active').length

        const totalPhotos = eventsList.reduce((acc: number, e: any) => acc + (e.totalPhotos || 0), 0)
        const totalFaces = eventsList.reduce((acc: number, e: any) => acc + (e.totalFaces || 0), 0)

        // Calculate storage
        let totalStorageBytes = 0
        eventsList.forEach((e: any) => {
            if (e.totalSizeBytes) {
                totalStorageBytes += e.totalSizeBytes
            } else {
                // Fallback
                totalStorageBytes += (e.totalPhotos || 0) * 2 * 1024 * 1024
            }
        })

        const totalStorageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)

        // 3. Get Orders Stats (Today)
        const { items: orders } = await scanTablePage({ tableName: ORDERS_TABLE, limit: MAX_ITEMS })
        // Filter for today (UTC)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todaysOrders = orders.filter((o: any) => new Date(o.createdAt).getTime() >= today.getTime())
        const todaysRevenue = todaysOrders.reduce((acc: number, o: any) => acc + (o.amount || 0), 0)

        // Uploads Today? 
        // We can't get this easily without scanning all photos or keeping a daily stat. 
        // For now we will return 0 or implement it later with SystemStatsTable.

        return successResponse({
            totalUsers,
            activeSubs,
            totalEvents,
            activeEvents,
            totalPhotos,
            totalFaces,
            totalStorageGB,
            todaysRevenue: todaysRevenue / 100, // Convert cents to main unit if needed, assuming amount is in smallest unit
            currency: 'RON'
        })
    } catch (error: any) {
        console.error('Error getting admin stats:', error)
        return errorResponse(error.message || 'Failed to get admin stats', 500)
    }
}
