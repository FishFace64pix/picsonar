import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { searchFacesByImage } from '../src/utils/rekognition'
import { getItem, queryItems } from '../src/utils/dynamodb'
import { getSignedUrlForDownload } from '../src/utils/s3'
import { successResponse, errorResponse } from '../src/utils/response'
import { z } from 'zod'

const REKOGNITION_COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!
const FACES_TABLE = process.env.FACES_TABLE!
const PHOTOS_TABLE = process.env.PHOTOS_TABLE!

// ========== IP RATE LIMITING (in-memory, per Lambda instance) ==========
// Protects against abuse of this costly public endpoint until API GW usage plan is configured.
// Allows MAX_REQUESTS per IP per WINDOW_MS.
const MAX_REQUESTS = 10          // max 10 requests per minute per IP
const WINDOW_MS = 60 * 1000      // 1 minute window
const ipRequestMap = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipRequestMap.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  if (entry.count > MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for IP: ${ip} (${entry.count} req/min)`)
    return true
  }
  return false
}
// ========================================================================

// Input validation schema
const QuerySchema = z.object({
  eventId: z.string().min(1, "eventId is required")
})

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Rate limiting check
    const clientIp =
      event.headers['x-forwarded-for']?.split(',')[0].trim() ||
      event.requestContext?.identity?.sourceIp ||
      'unknown'

    if (isRateLimited(clientIp)) {
      return errorResponse('Too many requests. Please try again later.', 429)
    }

    const queryParams = event.queryStringParameters || {}
    const validationResult = QuerySchema.safeParse(queryParams)

    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]
      return errorResponse(`${issue.path.join('.')}: ${issue.message}`, 400)
    }

    const { eventId } = validationResult.data

    // Check for multipart/form-data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || ''

    let imageBuffer: Buffer

    if (contentType.includes('multipart/form-data')) {
      const parser = require('lambda-multipart-parser')
      const result = await parser.parse(event)
      const file = result.files.find((f: any) => f.fieldname === 'image')

      if (!file) {
        return errorResponse('Image file is missing in form data', 400)
      }
      imageBuffer = file.content
    } else {
      // Fallback for direct binary or base64 (if used elsewhere)
      const body = event.body || ''
      const isBase64 = event.isBase64Encoded
      if (!body) return errorResponse('Image data is required', 400)

      imageBuffer = isBase64 ? Buffer.from(body, 'base64') : Buffer.from(body, 'binary')
    }

    // 1. Search for matching faces in Rekognition
    const faceMatches = await searchFacesByImage(REKOGNITION_COLLECTION_ID, imageBuffer)

    if (faceMatches.length === 0) {
      return successResponse({ matches: [] })
    }

    // 2. Optimization: Fetch ALL faces for this event ONCE
    // This removes the N+1 query problem.
    // Assuming 'eventId-index' exists on FacesTable as seen in previous code.
    const allEventFaces = await queryItems(
      FACES_TABLE,
      'eventId = :eventId',
      { ':eventId': eventId },
      'eventId-index'
    )

    // 3. Create a Map for O(1) lookup: rekognitionFaceId -> FaceRecord
    const faceMap = new Map<string, any>()
    for (const face of allEventFaces) {
      if (face.rekognitionFaceId) {
        faceMap.set(face.rekognitionFaceId, face)
      }
    }

    const matches = []

    // 4. Iterate Matches and Lookup in Map
    for (const match of faceMatches) {
      if (!match.Face || !match.Face.FaceId) continue

      const rekognitionFaceId = match.Face.FaceId
      const confidence = match.Similarity || 0

      const faceRecord = faceMap.get(rekognitionFaceId)

      if (!faceRecord) continue

      // Get all photos associated with this face
      // Note: We might still have N queries here if getting photos one by one.
      // Optimization: If possible, we could fetch all photos for event, but that might be too large.
      // For now, keeping photo fetch as is, but could be batched (BatchGetItem) if DynamoDB limit allows (up to 100 items).

      const photos = []
      // Use BatchGetItem logic if there are many photos, but for now linear fetch is existing logic.
      // A better approach for Phase 2: Photos should be denormalized or fetched in bulk.

      const associatedPhotos = faceRecord.associatedPhotos || []

      // Small optimization: Parallelize photo fetches
      const photoPromises = associatedPhotos.map(async (photoId: string) => {
        return getItem(PHOTOS_TABLE, { photoId })
      })

      const fetchedPhotos = await Promise.all(photoPromises)

      for (const photo of fetchedPhotos) {
        if (photo) {
          // If photo has s3Key, regenerate signed URL, otherwise use existing s3Url
          if (photo.s3Key) {
            const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!
            // Cache signed URL check? Usually signed URLs are cheap to generate.
            const s3Url = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, photo.s3Key, 86400 * 7)
            photos.push({ ...photo, s3Url })
          } else {
            photos.push(photo)
          }
        }
      }

      matches.push({
        faceId: faceRecord.faceId,
        confidence,
        photos,
      })
    }

    return successResponse({ matches })
  } catch (error: any) {
    console.error('Error matching face:', error)
    return errorResponse(error.message || 'Failed to match face', 500)
  }
}

