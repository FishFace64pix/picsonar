import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { queryItems } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'

const EVENTS_TABLE = process.env.EVENTS_TABLE!

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

    // Query using GSI
    const userEvents = await queryItems(
      EVENTS_TABLE,
      'userId = :userId',
      { ':userId': userId },
      'userId-index'
    )

    // Sort by createdAt descending
    userEvents.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return successResponse(userEvents)
  } catch (error: any) {
    console.error('Error getting events:', error)
    return errorResponse(error.message || 'Failed to get events', 500)
  }
}

