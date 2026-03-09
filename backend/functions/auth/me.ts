import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { getItem } from '../../src/utils/dynamodb'
import { getSignedUrlForDownload } from '../../src/utils/s3'
import { verifyAuthHeader } from '../../src/utils/jwt'

const USERS_TABLE = process.env.USERS_TABLE || ''
const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET || ''

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

    const user = await getItem(USERS_TABLE, { userId })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    const { password: _, ...userWithoutPassword } = user

    // Sign logo URL if present (White Label)
    if (userWithoutPassword.companyDetails?.logoKey) {
      try {
        const signedUrl = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, userWithoutPassword.companyDetails.logoKey, 3600)
        userWithoutPassword.companyDetails.logoUrl = signedUrl
      } catch (e) {
        console.error('Failed to sign logo URL:', e)
      }
    }

    return successResponse(userWithoutPassword)
  } catch (error: any) {
    console.error('Error getting user:', error)
    return errorResponse(error.message || 'Failed to get user', 500)
  }
}
