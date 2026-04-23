import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { scanTable } from '../../src/utils/dynamodb'

const EVENTS_TABLE = process.env.EVENTS_TABLE!
const USERS_TABLE = process.env.USERS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) return errorResponse('Authorization header is required', 401);
        const payload = verifyAuthHeader(authHeader);
        if (!payload || payload.role !== 'admin') return errorResponse('Forbidden: Admin access required', 403);

        // 1. Get all events
        const events = await scanTable(EVENTS_TABLE)

        // 2. Get all users for mapping (optional, but good for "Owner" name)
        // Optimization: In a real app, we would BatchGet users or just show UserID.
        // For MVP Admin, let's scan users too to show names.
        const users = await scanTable(USERS_TABLE)
        const userMap: Record<string, string> = {}
        users.forEach((u: any) => {
            userMap[u.userId] = u.name || u.email || 'Unknown'
        })

        const enrichedEvents = events.map((e: any) => {
            const photoCount = e.totalPhotos || 0

            let storageMB = 0
            if (e.totalSizeBytes) {
                // Precise tracking (Bytes -> MB)
                storageMB = e.totalSizeBytes / (1024 * 1024)
            } else {
                // Backward compatibility estimation: 2MB per photo
                storageMB = photoCount * 2
            }

            return {
                eventId: e.eventId,
                name: e.eventName,
                ownerId: e.userId,
                ownerName: userMap[e.userId] || 'Unknown',
                status: e.status || 'active',
                date: e.createdAt,
                photoCount: photoCount,
                faceCount: e.totalFaces || 0,
                storageMB: storageMB,
                // If we have actual sizeBytes in future, use that.
            }
        })

        // Sort by date desc
        enrichedEvents.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return successResponse(enrichedEvents)
    } catch (error: any) {
        console.error('Error getting admin events:', error)
        return errorResponse(error.message || 'Failed to list events', 500)
    }
}
