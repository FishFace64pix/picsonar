import { getItem } from '../utils/dynamodb'
import { ForbiddenError, NotFoundError } from '../utils/errors'
import type { JwtPayload, Event as EventEntity } from '@picsonar/shared/types'
import { getEnv } from '../config/env'

/**
 * Loads the event and verifies the caller owns it (unless admin).
 * Returns the event so handlers don't need to re-fetch.
 */
export async function ensureEventOwnership(
  eventId: string,
  jwt: JwtPayload,
): Promise<EventEntity> {
  const eventsTable = getEnv().EVENTS_TABLE
  const event = (await getItem(eventsTable, { eventId })) as EventEntity | null
  if (!event) throw new NotFoundError('Event not found')
  if (jwt.role !== 'admin' && event.userId !== jwt.userId) {
    throw new ForbiddenError('You do not have access to this event')
  }
  return event
}

/**
 * For endpoints that take a photoId — ensures the photo's event is owned by caller.
 */
export async function ensurePhotoOwnership(
  photoId: string,
  jwt: JwtPayload,
): Promise<{ photo: any; event: EventEntity }> {
  const { PHOTOS_TABLE, EVENTS_TABLE } = getEnv() as any
  const photo = await getItem(PHOTOS_TABLE, { photoId })
  if (!photo) throw new NotFoundError('Photo not found')
  const event = (await getItem(EVENTS_TABLE, { eventId: photo.eventId })) as EventEntity | null
  if (!event) throw new NotFoundError('Parent event not found')
  if (jwt.role !== 'admin' && event.userId !== jwt.userId) {
    throw new ForbiddenError('You do not have access to this photo')
  }
  return { photo, event }
}
