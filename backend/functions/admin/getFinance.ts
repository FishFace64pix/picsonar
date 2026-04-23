import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTable } from '../../src/utils/dynamodb'

const ORDERS_TABLE = process.env.ORDERS_TABLE!
const USERS_TABLE = process.env.USERS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        // 1. Get all orders
        const orders = await scanTable(ORDERS_TABLE)

        // Sort orders by date desc
        orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // 2. Calculate Total Revenue
        // Amount is usually in cents if Stripe, but check createPaymentIntent logic. 
        // Looking at previous code, amounts were fixed integers like 229, 449, 1450 (RON).
        // Assuming they are stored as whole RON units derived from the packages consts, 
        // OR if they are stripe amounts in cents. 
        // Let's assume stored amount = actual value for now or standard cents.
        // Checking createPaymentIntent: const amounts = { starter_credit: 22900, ... } -> Cents.

        const totalRevenueCents = orders.reduce((acc: number, o: any) => acc + (o.amount || 0), 0)
        const totalRevenue = totalRevenueCents / 100

        // 3. Recent Transactions (Last 50)
        const recentOrders = orders.slice(0, 50).map((o: any) => ({
            orderId: o.orderId,
            userId: o.userId,
            amount: (o.amount || 0) / 100,
            currency: o.currency || 'ron',
            pkg: o.packageId,
            status: 'paid', // If it's in orders table, it's paid (usually)
            date: o.createdAt
        }))

        // 4. Package Distribution
        const packageStats: Record<string, number> = {}
        orders.forEach((o: any) => {
            const pid = o.packageId || 'unknown'
            packageStats[pid] = (packageStats[pid] || 0) + 1
        })

        return successResponse({
            totalRevenue,
            totalOrders: orders.length,
            recentOrders,
            packageStats
        })

    } catch (error: any) {
        console.error('Error getting finance stats:', error)
        return errorResponse(error.message || 'Failed to get finance stats', 500)
    }
}
