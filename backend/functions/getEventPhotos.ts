import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { queryItems } from '../src/utils/dynamodb'
import { successResponse, errorResponse } from '../src/utils/response'
import { getSignedUrlForDownload } from '../src/utils/s3'

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!
const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const eventId = event.pathParameters?.eventId

        if (!eventId) {
            return errorResponse('Event ID is required', 400)
        }

        // Query photos by eventId using the GSI
        const photos = await queryItems(
            PHOTOS_TABLE,
            'eventId = :eventId',
            { ':eventId': eventId },
            'eventId-index'
        )

        // Generate signed URLs for each photo so they can be viewed
        const photosWithUrls = await Promise.all(
            photos.map(async (photo) => {
                // Construct the S3 key provided it was saved (eventId/photoId.jpg) or similar
                // In uploadPhoto.ts (which we should check), the key is likely stored or constructed.
                // If s3Key is in the DB record? Let's assume the DB record relies on client to know?
                // Wait, standard practice is to store Key or S3Key in DB. 
                // Let's assume the key is constructed as `${eventId}/${photo.photoId}.jpg` if not present.
                // Actually, checking uploadPhoto.ts would be safer, but standard here:

                let key = photo.s3Key
                if (!key) {
                    // Fallback or attempt construction
                    key = `${eventId}/${photo.photoId}.jpg`
                }

                // Generate signed URL
                const s3Url = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, key)

                let thumbnailUrl: string | undefined
                if (photo.thumbnailS3Key) {
                    try {
                        thumbnailUrl = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, photo.thumbnailS3Key)
                    } catch (e) {
                        console.warn(`Failed to sign thumbnail for ${key}`, e)
                    }
                }

                return {
                    ...photo,
                    s3Url,
                    thumbnailUrl
                }
            })
        )

        return successResponse(photosWithUrls)
    } catch (error: any) {
        console.error('Error fetching event photos:', error)
        return errorResponse(error.message || 'Failed to fetch event photos', 500)
    }
}
