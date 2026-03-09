import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { updateItem } from '../../src/utils/dynamodb'
import { verifyAuthHeader } from '../../src/utils/jwt'

const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization

    const payload = verifyAuthHeader(authHeader)
    if (!payload) {
      return errorResponse('Invalid or expired token', 401)
    }

    const { userId } = payload

    if (!event.body) {
      return errorResponse('Request body is required', 400)
    }

    const { companyDetails } = JSON.parse(event.body)

    if (!companyDetails) {
      return errorResponse('companyDetails is required', 400)
    }

    await updateItem(
      USERS_TABLE,
      { userId },
      'set companyDetails = :companyDetails',
      { ':companyDetails': companyDetails }
    )

    return successResponse({ message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return errorResponse(error.message || 'Failed to update profile', 500)
  }
}
