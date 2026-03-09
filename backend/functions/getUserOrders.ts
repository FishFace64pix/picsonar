import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../src/utils/response'
import { queryItems } from '../src/utils/dynamodb'

const ORDERS_TABLE = process.env.ORDERS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) {
            return errorResponse('Authorization header is required', 401)
        }

        const token = authHeader.replace('Bearer ', '')
        const [userId] = token.split(':')

        if (!userId) {
            return errorResponse('Invalid token', 401)
        }

        const orders = await queryItems(
            ORDERS_TABLE,
            'userId = :userId',
            { ':userId': userId },
            'userId-index'
        )

        // Sort by createdAt descending
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return successResponse(orders)
    } catch (error: any) {
        console.error('Error getting user orders:', error)
        return errorResponse(error.message || 'Failed to get user orders', 500)
    }
}
