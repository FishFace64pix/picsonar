/**
 * POST /events
 *
 * Creates a new event for the authenticated user.
 *
 * Security & correctness:
 *   - requireAuth: no event without a verified JWT.
 *   - parseBody(CreateEventSchema): eventName length + shape validated.
 *   - Credit deduction uses a ConditionExpression so two concurrent
 *     createEvent calls cannot spend the same credit (previously the user
 *     could race the decrement and burn < 1 credit into overdraft).
 *   - Any failure after credit deduction triggers a best-effort refund so
 *     we do not leave the user with a phantom charge.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

import { CreateEventSchema } from '@picsonar/shared/schemas'
import { PACKAGES } from '@picsonar/shared/constants'

import { getEnv } from '../src/config/env'
import { withHandler } from '../src/middleware/handler'
import { requireAuth } from '../src/middleware/auth'
import { parseBody } from '../src/middleware/validate'
import {
  enforceRateLimit,
  rateLimitIdentity,
} from '../src/middleware/rateLimit'
import { getItem, putItem, updateItem } from '../src/utils/dynamodb'
import { AppError, ForbiddenError, NotFoundError } from '../src/utils/errors'
import { successResponse } from '../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const env = getEnv()

  await enforceRateLimit({
    endpoint: 'events:create',
    identity: rateLimitIdentity(event, jwt.userId),
    max: 20,
    windowSec: 60,
  })

  const input = parseBody(event, CreateEventSchema)

  const user = await getItem(env.USERS_TABLE, { userId: jwt.userId })
  if (!user) throw new NotFoundError('User not found')

  // Determine which credit slot to deduct from.
  // If packageId is provided, use the per-package field; otherwise fall back to
  // the legacy eventCredits pool (for users who purchased before per-package tracking).
  const packageId = input.packageId as keyof typeof PACKAGES | undefined
  const userPlan: keyof typeof PACKAGES =
    (user.plan as keyof typeof PACKAGES) ?? 'starter'
  const resolvedPackageId = packageId ?? userPlan
  const packageDetails = PACKAGES[resolvedPackageId] ?? PACKAGES.starter
  const photoLimit = packageDetails.limits.photoLimitPerEvent
  const storageMonths = packageDetails.limits.storageMonths

  // --- Atomic credit decrement ---
  // Per-package: deduct from credits_{packageId}.
  // Legacy fallback: deduct from eventCredits (for users without per-package credits).
  const usePerPackage = packageId !== undefined
  try {
    if (usePerPackage) {
      await updateItem(
        env.USERS_TABLE,
        { userId: jwt.userId },
        'SET #credits = #credits - :one',
        { ':one': 1, ':min': 1 },
        { '#credits': `credits_${packageId}` },
        '#credits >= :min',
      )
    } else {
      await updateItem(
        env.USERS_TABLE,
        { userId: jwt.userId },
        'SET eventCredits = eventCredits - :one',
        { ':one': 1, ':min': 1 },
        undefined,
        'eventCredits >= :min',
      )
    }
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      throw new ForbiddenError(
        'No event credits remaining. Please purchase a bundle.',
      )
    }
    throw err
  }

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + storageMonths)

  const newEvent = {
    eventId: uuidv4(),
    userId: jwt.userId,
    eventName: input.eventName,
    eventDate: input.eventDate,
    description: input.description,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active' as const,
    totalPhotos: 0,
    totalFaces: 0,
    totalSizeBytes: 0,
    photoLimit,
    storageMonths,
    planAtCreation: resolvedPackageId,
  }

  try {
    await putItem(env.EVENTS_TABLE, newEvent, 'attribute_not_exists(eventId)')
  } catch (err) {
    // Refund the credit — we don't want to double-charge on an infra error.
    if (usePerPackage) {
      await updateItem(
        env.USERS_TABLE,
        { userId: jwt.userId },
        'SET #credits = #credits + :one',
        { ':one': 1 },
        { '#credits': `credits_${packageId}` },
      ).catch((refundErr) =>
        console.error('[createEvent] CRITICAL: credit refund failed', {
          userId: jwt.userId,
          refundErr,
        }),
      )
    } else {
      await updateItem(
        env.USERS_TABLE,
        { userId: jwt.userId },
        'SET eventCredits = eventCredits + :one',
        { ':one': 1 },
      ).catch((refundErr) =>
        console.error('[createEvent] CRITICAL: credit refund failed', {
          userId: jwt.userId,
          refundErr,
        }),
      )
    }
    throw new AppError('Failed to create event', 500, 'EVENT_CREATE_FAILED')
  }

  return successResponse(newEvent, 201, { requestOrigin: ctx.requestOrigin })
})
