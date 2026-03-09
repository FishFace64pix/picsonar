import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { putItem, queryItems } from '../../src/utils/dynamodb'
import { signToken } from '../../src/utils/jwt'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'

const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse('Request body is required', 400)
    }

    const { email, password, name, legal } = JSON.parse(event.body)

    if (!email || !password || !name) {
      return errorResponse('Email, password, and name are required', 400)
    }

    // Metadata for legal audit
    const ip = event.requestContext?.identity?.sourceIp || 'unknown'
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || 'unknown'

    // Check if user already exists
    const existingUsers = await queryItems(
      USERS_TABLE,
      'email = :email',
      { ':email': email },
      'email-index'
    )

    if (existingUsers.length > 0) {
      return errorResponse('User already exists with this email', 409)
    }

    const userId = uuidv4()
    // Simple hash for MVP - in production use bcryptjs or argon2
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    const newUser = {
      userId,
      email,
      name,
      role: 'user',
      password: passwordHash,
      createdAt: new Date().toISOString(),
      acceptedTermsAt: legal?.termsAccepted ? new Date().toISOString() : null,
      acceptedPrivacyAt: legal?.privacyAccepted ? new Date().toISOString() : null,
      acceptedDpaAt: legal?.dpaAccepted ? new Date().toISOString() : null,
      legalAudit: {
        ip,
        userAgent,
        termsVersion: '1.0',
        privacyVersion: '1.0',
        dpaVersion: '1.0'
      },
      plan: 'starter',
      eventCredits: 0,
      subscriptionStatus: 'inactive',
      companyDetails: {}
    }

    await putItem(USERS_TABLE, newUser)

    // Issue a signed JWT (HS256, 24h TTL)
    const token = signToken(userId, 'user')

    // Don't return password
    const { password: _, ...userWithoutPassword } = newUser

    return successResponse({ token, user: userWithoutPassword }, 201)
  } catch (error: any) {
    console.error('Error registering:', error)
    return errorResponse(error.message || 'Failed to register', 500)
  }
}
