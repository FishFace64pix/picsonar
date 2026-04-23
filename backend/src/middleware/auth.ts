import type { APIGatewayProxyEvent } from 'aws-lambda'
import { verifyAuthHeader } from '../utils/jwt'
import type { JwtPayload } from '@picsonar/shared/types'
import { AuthError, ForbiddenError } from '../utils/errors'

/**
 * Extracts and verifies the JWT from an APIGateway event.
 * Throws AuthError on any failure — always caught by withErrorHandler.
 */
export function requireAuth(event: APIGatewayProxyEvent): JwtPayload {
  const authHeader =
    event.headers?.Authorization ??
    event.headers?.authorization ??
    event.headers?.AUTHORIZATION

  const payload = verifyAuthHeader(authHeader)
  if (!payload) throw new AuthError('Missing or invalid authorization token')
  if (!payload.userId) throw new AuthError('Invalid token payload')
  return payload
}

export function requireAdmin(event: APIGatewayProxyEvent): JwtPayload {
  const payload = requireAuth(event)
  if (payload.role !== 'admin') throw new ForbiddenError('Admin access required')
  return payload
}

/** Optional auth — returns payload if valid, null otherwise. Never throws. */
export function tryAuth(event: APIGatewayProxyEvent): JwtPayload | null {
  try {
    return requireAuth(event)
  } catch {
    return null
  }
}
