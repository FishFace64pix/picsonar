import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { putItem } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'
import { PACKAGES } from '../src/constants/packages'
import { verifyAuthHeader } from '../src/utils/jwt'

const EVENTS_TABLE = process.env.EVENTS_TABLE!

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify JWT and extract userId
    const authHeader = event.headers.Authorization || event.headers.authorization
    const jwtPayload = verifyAuthHeader(authHeader)
    if (!jwtPayload) {
      return errorResponse('Invalid or expired token', 401)
    }
    const { userId } = jwtPayload

    if (!event.body) {
      return errorResponse('Request body is required', 400)
    }

    const { eventName } = JSON.parse(event.body)

    if (!eventName) {
      return errorResponse('eventName is required', 400)
    }

    // 1. Get User Limits
    const USERS_TABLE = process.env.USERS_TABLE!
    const { getItem, scanTable } = require('../src/utils/dynamodb') // Lazy load or move imports up

    const user = await getItem(USERS_TABLE, { userId })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    // Check for Event Credits
    const eventCredits = user.eventCredits || 0
    if (eventCredits <= 0) {
      return errorResponse('No event credits remaining. Please purchase a bundle.', 403)
    }

    const userPlan = user.plan || 'starter'
    const packageDetails = (PACKAGES as any)[userPlan]
    const photoLimit = packageDetails?.limits?.photoLimitPerEvent || 1000
    const storageMonths = packageDetails?.limits?.storageMonths || 2

    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + storageMonths)

    // Decrement credits (Atomic update)
    const { updateItem } = require('../src/utils/dynamodb')
    await updateItem(USERS_TABLE, { userId }, 'SET eventCredits = eventCredits - :dec', { ':dec': 1 })

    const eventId = uuidv4()
    const newEvent = {
      eventId,
      userId,
      eventName,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      status: 'active',
      totalPhotos: 0,
      totalFaces: 0,
      photoLimit,
      storageMonths,
      planAtCreation: userPlan
    }

    await putItem(EVENTS_TABLE, newEvent)

    return successResponse(newEvent, 201)
  } catch (error: any) {
    console.error('Error creating event:', error)
    return errorResponse(error.message || 'Failed to create event', 500)
  }
}

