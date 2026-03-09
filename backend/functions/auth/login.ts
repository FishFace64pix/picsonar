import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { queryItems } from '../../src/utils/dynamodb'
import { signToken } from '../../src/utils/jwt'
import * as crypto from 'crypto'

const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400)
    }

    const { email, password } = JSON.parse(event.body)

    if (!email || !password) {
      return errorResponse('Email and password are required', 400)
    }

    const users = await queryItems(
      USERS_TABLE,
      'email = :email',
      { ':email': email },
      'email-index'
    )

    if (users.length === 0) {
      return errorResponse('Invalid email or password', 401)
    }

    const user = users[0]
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    if (user.password !== passwordHash) {
      return errorResponse('Invalid email or password', 401)
    }

    // Issue a signed JWT (HS256, 24h TTL)
    const token = signToken(user.userId, user.role || 'user')

    const { password: _, ...userWithoutPassword } = user

    return successResponse({ token, user: userWithoutPassword }, 200)
  } catch (error: any) {
    console.error('Error logging in:', error)
    return errorResponse(error.message || 'Failed to login', 500)
  }
}
