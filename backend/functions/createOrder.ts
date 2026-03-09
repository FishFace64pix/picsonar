import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../src/utils/response'
import { putItem } from '../src/utils/dynamodb'
import { v4 as uuidv4 } from 'uuid'

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
      return errorResponse('Invalid token format', 401)
    }

    if (!event.body) {
      return errorResponse('Request body is required', 400)
    }

    const { amount, description, currency = 'RON' } = JSON.parse(event.body)

    if (!amount || !description) {
      return errorResponse('Amount and description are required', 400)
    }

    const orderId = uuidv4()
    const newOrder = {
      orderId,
      userId,
      amount,
      description,
      currency,
      status: 'PAID',
      createdAt: new Date().toISOString()
    }

    await putItem(ORDERS_TABLE, newOrder)

    return successResponse(newOrder, 201)
  } catch (error: any) {
    console.error('Error creating order:', error)
    return errorResponse(error.message || 'Failed to create order', 500)
  }
}
