import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { uploadToS3, getSignedUrlForDownload, deleteFromS3 } from '../../src/utils/s3'
import { getItem, updateItem } from '../../src/utils/dynamodb'
import { verifyAuthHeader } from '../../src/utils/jwt'

const BUCKET_NAME = process.env.RAW_PHOTOS_BUCKET || ''
const USERS_TABLE = process.env.USERS_TABLE || ''

const MAX_SIZE_BYTES = 3 * 1024 * 1024 // 3 MB

/**
 * POST /user/upload-logo
 * Body: { imageData: "<base64>", contentType: "image/jpeg"|"image/png" }
 *
 * Uploads logo server-side to avoid browser CORS + S3 checksum issues with
 * presigned PUT URLs. Returns a signed read URL for immediate preview.
 */
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) return errorResponse('Authorization header is required', 401)

        const payload = verifyAuthHeader(authHeader)
        if (!payload) return errorResponse('Invalid or expired token', 401)

        const { userId } = payload

        const user = await getItem(USERS_TABLE, { userId })
        if (!user || !['studio', 'agency'].includes(user.plan)) {
            return errorResponse('White label branding requires Studio or Agency plan.', 403)
        }

        if (!event.body) return errorResponse('Request body is required', 400)

        let body: { imageData?: string; contentType?: string }
        try {
            body = JSON.parse(event.body)
        } catch {
            return errorResponse('Invalid JSON body', 400)
        }

        const { imageData, contentType = 'image/jpeg' } = body
        if (!imageData) return errorResponse('imageData is required', 400)

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
            return errorResponse('contentType must be image/jpeg, image/png, or image/webp', 400)
        }

        const buffer = Buffer.from(imageData, 'base64')
        if (buffer.length > MAX_SIZE_BYTES) {
            return errorResponse('Logo must be under 3 MB', 400)
        }

        const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
        const key = `logos/${userId}/${Date.now()}.${ext}`

        await uploadToS3(BUCKET_NAME, key, buffer, contentType)

        // Delete the previous logo from S3 to avoid accumulating unused objects.
        const existingDetails = (user.companyDetails as Record<string, unknown>) || {}
        const previousKey = existingDetails.logoKey as string | undefined
        if (previousKey && previousKey !== key) {
            try { await deleteFromS3(BUCKET_NAME, previousKey) } catch { /* best-effort */ }
        }

        // Persist the key on the user record so getEvent can generate signed read URLs.
        // Use SET on the whole companyDetails map to avoid DynamoDB nested-path failures
        // when companyDetails doesn't exist yet.
        await updateItem(
            USERS_TABLE,
            { userId },
            'SET companyDetails = :cd',
            { ':cd': { ...existingDetails, logoKey: key } },
        )

        const readUrl = await getSignedUrlForDownload(BUCKET_NAME, key, 3600)

        return successResponse({ key, readUrl })

    } catch (error: any) {
        console.error('[uploadLogo] Error:', error)
        return errorResponse(error.message || 'Failed to upload logo', 500)
    }
}
