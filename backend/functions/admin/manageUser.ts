import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../../src/utils/response'
import { updateItem, deleteItem } from '../../src/utils/dynamodb'
import { logAdminAction } from '../../src/utils/audit'

const USERS_TABLE = process.env.USERS_TABLE!

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        if (!event.body) {
            return errorResponse('Missing body', 400)
        }

        const { userId, action, payload } = JSON.parse(event.body)

        if (!userId || !action) {
            return errorResponse('userId and action are required', 400)
        }

        switch (action) {
            case 'suspend':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'suspended' })
                return successResponse({ message: 'User suspended' })

            case 'activate':
                await updateItem(USERS_TABLE, { userId }, 'SET subscriptionStatus = :status', { ':status': 'active' })
                return successResponse({ message: 'User activated' })

            case 'add_credits':
                await updateItem(
                    USERS_TABLE,
                    { userId },
                    'SET eventCredits = if_not_exists(eventCredits, :zero) + :val',
                    { ':zero': 0, ':val': payload?.amount || 1 }
                )
                return successResponse({ message: 'Credits added' })

            case 'delete':
                // This is dangerous. Should probably also delete all their events/photos.
                // For MVP admin, we'll just delete the user record.
                await deleteItem(USERS_TABLE, { userId })
                return successResponse({ message: 'User deleted' })

            default:
                return errorResponse('Invalid action', 400)
        }

    } catch (error: any) {
        console.error('Error managing user:', error)
        return errorResponse(error.message || 'Failed to manage user', 500)
    }
}
