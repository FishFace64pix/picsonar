import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getItem } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'
import { getSignedUrlForDownload } from '../src/utils/s3'

const EVENTS_TABLE = process.env.EVENTS_TABLE!
const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId

    if (!eventId) {
      return errorResponse('eventId is required', 400)
    }

    const eventData = await getItem(EVENTS_TABLE, { eventId })

    if (!eventData) {
      return errorResponse('Event not found', 404)
    }

    // Enhance with Organizer Logo
    // We need to fetch the user to get the logo from companyDetails
    let organizerLogo = null
    if (eventData.userId) {
      const user = await getItem(process.env.USERS_TABLE!, { userId: eventData.userId })
      if (user && user.companyDetails) {
        if (user.companyDetails.logoKey) {
          // Prefer Key and sign it
          try {
            organizerLogo = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, user.companyDetails.logoKey, 3600)
          } catch (e) {
            console.warn('Failed to sign organizer logo', e)
          }
        } else if (user.companyDetails.logoUrl) {
          // Fallback to legacy url
          organizerLogo = user.companyDetails.logoUrl
        }
      }
    }

    return successResponse({ ...eventData, organizerLogo })
  } catch (error: any) {
    console.error('Error getting event:', error)
    return errorResponse(error.message || 'Failed to get event', 500)
  }
}

