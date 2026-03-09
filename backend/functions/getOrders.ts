import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../src/utils/response'
import { scanTable, getItem } from '../src/utils/dynamodb'

const ORDERS_TABLE = process.env.ORDERS_TABLE || ''
const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const orders = await scanTable(ORDERS_TABLE)
    const userIds = [...new Set(orders.map((o: any) => o.userId))]
    const usersMap: Record<string, any> = {}
    for (const uid of userIds) {
      const u = await getItem(USERS_TABLE, { userId: uid })
      if (u) { usersMap[uid] = u }
    }
    const enrichedOrders = orders.map((order: any) => {
        const user = usersMap[order.userId]
        return { ...order, user: user ? { name: user.name, email: user.email, companyDetails: user.companyDetails } : null }
    })
    enrichedOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return successResponse(enrichedOrders)
  } catch (error: any) {
    console.error('Error getting orders:', error)
    return errorResponse(error.message || 'Failed to get orders', 500)
  }
}
