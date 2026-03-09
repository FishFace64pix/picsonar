import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { queryItems } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'

const FACES_TABLE = process.env.FACES_TABLE!

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId

    if (!eventId) {
      return errorResponse('eventId is required', 400)
    }

    const faces = await queryItems(
      FACES_TABLE,
      'eventId = :eventId',
      { ':eventId': eventId },
      'eventId-index'
    )

    return successResponse(faces)
  } catch (error: any) {
    console.error('Error getting event faces:', error)
    return errorResponse(error.message || 'Failed to get event faces', 500)
  }
}

