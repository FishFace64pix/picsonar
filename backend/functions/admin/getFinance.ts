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
            endpoint: 'admin:finance',
            identity: rateLimitIdentity(event),
            max: 10,
            windowSec: 60,
        })

        const { items: orders } = await scanTablePage({ tableName: env.ORDERS_TABLE, limit: MAX_ITEMS })

        orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        const totalRevenueCents = orders.reduce((acc: number, o: any) => acc + (o.amount || 0), 0)
        const totalRevenue = totalRevenueCents / 100

        const recentOrders = orders.slice(0, 50).map((o: any) => ({
            orderId: o.orderId,
            userId: o.userId,
            amount: (o.amount || 0) / 100,
            currency: o.currency || 'ron',
            pkg: o.packageId,
            status: o.status || 'paid',
            date: o.createdAt,
            billing: o.invoiceSnapshot || {},
        }))

        const packageStats: Record<string, number> = {}
        orders.forEach((o: any) => {
            const pid = o.packageId || 'unknown'
            packageStats[pid] = (packageStats[pid] || 0) + 1
        })

        return successResponse({
            totalRevenue,
            totalOrders: orders.length,
            recentOrders,
            packageStats,
        }, 200, { requestOrigin })
    } catch (error: any) {
        console.error('Error getting finance stats:', error)
        return errorResponse(error.message || 'Failed to get finance stats', 500, { requestOrigin })
    }
}
