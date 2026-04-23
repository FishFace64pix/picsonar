import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTable } from '../../src/utils/dynamodb'

const USERS_TABLE = process.env.USERS_TABLE!
const EVENTS_TABLE = process.env.EVENTS_TABLE!
const ORDERS_TABLE = process.env.ORDERS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        // In a real production app with millions of records, SCAN is bad.
        // Ideally we should use the SystemStatsTable to increment counters.
        // For now (MVP/Startup scale), scanning is acceptable and ensures 100% accuracy.

        // 1. Get Users Stats
        const users = await scanTable(USERS_TABLE)
        const totalUsers = users.length
        const activeSubs = users.filter((u: any) => u.subscriptionStatus === 'active').length

        // 2. Get Events Stats
        const eventsList = await scanTable(EVENTS_TABLE)
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
        const orders = await scanTable(ORDERS_TABLE)
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
