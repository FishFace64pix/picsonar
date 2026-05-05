import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { getSignedUrlForUpload, getSignedUrlForDownload } from '../../src/utils/s3'
import { getItem } from '../../src/utils/dynamodb'
import { verifyAuthHeader } from '../../src/utils/jwt'

const BUCKET_NAME = process.env.RAW_PHOTOS_BUCKET || ''
const USERS_TABLE = process.env.USERS_TABLE || ''

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization
        if (!authHeader) return errorResponse('Authorization header is required', 401)

        const payload = verifyAuthHeader(authHeader)
        if (!payload) return errorResponse('Invalid or expired token', 401)

        const { userId } = payload

        // Check User Plan — white label requires Studio or Agency
        const user = await getItem(USERS_TABLE, { userId })
        if (!user || !['studio', 'agency'].includes(user.plan)) {
            return errorResponse('White label branding requires Studio or Agency plan.', 403)
        }

        const timestamp = Date.now()
        const key = `logos/${userId}/${timestamp}.jpg`

        // Generate pre-signed URL for PUT operation
        const uploadUrl = await getSignedUrlForUpload(BUCKET_NAME, key, 300)

        // Generate pre-signed URL for GET (preview)
        // Note: The file doesn't exist yet, but the URL will be valid once uploaded
        const readUrl = await getSignedUrlForDownload(BUCKET_NAME, key, 3600)

        return successResponse({
            uploadUrl,
            readUrl, // Use this for immediate preview
            key
        })

    } catch (error: any) {
        console.error('Error generating upload URL:', error)
        return errorResponse(error.message || 'Failed to generate upload URL', 500)
    }
}
