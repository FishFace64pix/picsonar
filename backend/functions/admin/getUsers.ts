import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { scanTable, queryItems } from '../../src/utils/dynamodb'

const USERS_TABLE = process.env.USERS_TABLE!
const EVENTS_TABLE = process.env.EVENTS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // 1. Get all users
        const users = await scanTable(USERS_TABLE)

        // 2. Enrich with event counts (This is expensive for many users, but fine for MVP admin)
        // A better way would be to store eventCount on the user item itself.
        // For now, we will just return user basic info to be fast.
        // Frontend can fetch event counts lazily if needed, or we implement a stats aggregator.

        // Let's try to do a quick aggregation if total users is small (<1000)
        const events = await scanTable(EVENTS_TABLE)
        const userEventCounts: Record<string, number> = {}

        events.forEach((e: any) => {
            userEventCounts[e.userId] = (userEventCounts[e.userId] || 0) + 1
        })

        const enrichedUsers = users.map((u: any) => ({
            userId: u.userId,
            email: u.email,
            name: u.name || 'N/A',
            role: u.role || 'user',
            subscriptionStatus: u.subscriptionStatus || 'inactive',
            createdAt: u.createdAt,
            lastLogin: u.lastLogin, // Assuming we track this
            eventCount: userEventCounts[u.userId] || 0,
            credits: u.eventCredits || 0
        }))

        // Sort by createdAt desc
        enrichedUsers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return successResponse(enrichedUsers)
    } catch (error: any) {
        console.error('Error getting admin users:', error)
        return errorResponse(error.message || 'Failed to list users', 500)
    }
}
