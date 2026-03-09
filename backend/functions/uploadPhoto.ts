import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { uploadToS3, getSignedUrlForDownload } from '../src/utils/s3'
import { putItem, getItem, updateItem } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'

const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!
const PHOTOS_TABLE = process.env.PHOTOS_TABLE!
const EVENTS_TABLE = process.env.EVENTS_TABLE!

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const eventId = event.pathParameters?.eventId

    if (!eventId) {
      return errorResponse('eventId is required', 400)
    }

    // Check if event exists
    const eventData = await getItem(EVENTS_TABLE, { eventId })
    if (!eventData) {
      return errorResponse('Event not found', 404)
    }

    const photoLimit = eventData.photoLimit || 1000 // Fallback to starter limit

    // Check if event is active or expired
    if (eventData.status !== 'active') {
      return errorResponse('Event is no longer active', 403)
    }

    // Check if limit reached
    if (eventData.totalPhotos >= photoLimit) {
      return errorResponse(`Photo limit reached. Your plan allows a maximum of ${photoLimit} photos per event.`, 403)
    }

    // Check for multipart/form-data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''

    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Content-Type must be multipart/form-data', 400)
    }

    const parser = require('lambda-multipart-parser')
    const result = await parser.parse(event)

    // In our frontend we send 'photo' as the field name
    const file = result.files.find((f: any) => f.fieldname === 'photo')

    if (!file) {
      return errorResponse('Photo file is missing in form data', 400)
    }

    const imageBuffer = file.content

    const photoId = uuidv4()
    const key = `${eventId}/${photoId}.jpg`

    // Upload to S3
    await uploadToS3(RAW_PHOTOS_BUCKET, key, imageBuffer, 'image/jpeg')

    // Create photo record
    const s3Url = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, key, 86400 * 7) // 7 days
    const photo = {
      photoId,
      eventId,
      s3Url,
      s3Key: key, // Store S3 key for regenerating signed URLs
      faces: [],
      uploadedAt: new Date().toISOString(),
    }

    await putItem(PHOTOS_TABLE, photo)

    // Update event photo count
    await updateItem(
      EVENTS_TABLE,
      { eventId },
      'SET totalPhotos = totalPhotos + :inc',
      { ':inc': 1 }
    )

    return successResponse(photo, 201)
  } catch (error: any) {
    console.error('Error uploading photo:', error)
    return errorResponse(error.message || 'Failed to upload photo', 500)
  }
}

