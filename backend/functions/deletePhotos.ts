import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getItem, deleteItem, updateItem } from '../src/utils/dynamodb'
import { deleteFromS3 } from '../src/utils/s3'
import { deleteFaces } from '../src/utils/rekognition'
import { successResponse, errorResponse } from '../src/utils/response'

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!
const FACES_TABLE = process.env.FACES_TABLE!
const EVENTS_TABLE = process.env.EVENTS_TABLE!
const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!
const REKOGNITION_COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const eventId = event.pathParameters?.eventId
        if (!eventId) {
            return errorResponse('eventId is required', 400)
        }

        if (!event.body) {
            return errorResponse('Request body is required', 400)
        }

        const { photoIds } = JSON.parse(event.body)
        if (!photoIds || !Array.isArray(photoIds)) {
            return errorResponse('photoIds array is required', 400)
        }

        let deletedCount = 0
        let totalFacesDeleted = 0

        for (const photoId of photoIds) {
            // 1. Get photo record
            const photo = await getItem(PHOTOS_TABLE, { photoId })
            if (!photo || photo.eventId !== eventId) continue

            // 2. Delete from S3 (Original and Thumbnail)
            if (photo.s3Key) {
                await deleteFromS3(RAW_PHOTOS_BUCKET, photo.s3Key)
            }
            if (photo.thumbnailS3Key) {
                await deleteFromS3(RAW_PHOTOS_BUCKET, photo.thumbnailS3Key)
            }

            // 3. Delete faces from Rekognition and FacesTable
            if (photo.faces && Array.isArray(photo.faces) && photo.faces.length > 0) {
                const rekognitionFaceIds: string[] = []
                for (const faceId of photo.faces) {
                    const face = await getItem(FACES_TABLE, { faceId })
                    if (face && face.rekognitionFaceId) {
                        rekognitionFaceIds.push(face.rekognitionFaceId)
                    }
                    await deleteItem(FACES_TABLE, { faceId })
                }

                if (rekognitionFaceIds.length > 0) {
                    try {
                        await deleteFaces(REKOGNITION_COLLECTION_ID, rekognitionFaceIds)
                    } catch (err) {
                        console.error('Error deleting faces from Rekognition:', err)
                    }
                }
                totalFacesDeleted += photo.faces.length
            }

            // 4. Delete photo record from DynamoDB
            await deleteItem(PHOTOS_TABLE, { photoId })
            deletedCount++
        }

        // 5. Update event stats
        if (deletedCount > 0) {
            await updateItem(
                EVENTS_TABLE,
                { eventId },
                'SET totalPhotos = totalPhotos - :pc, totalFaces = totalFaces - :fc',
                { ':pc': deletedCount, ':fc': totalFacesDeleted }
            )
        }

        return successResponse({ deletedCount, totalFacesDeleted })
    } catch (error: any) {
        console.error('Error deleting photos:', error)
        return errorResponse(error.message || 'Failed to delete photos', 500)
    }
}
