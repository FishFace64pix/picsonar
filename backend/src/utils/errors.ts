/**
 * Typed domain errors. Thrown inside handlers + services, caught by
 * `withHandler`, which maps them to proper HTTP status + JSON shape.
 *
 * Constructor order is (message, statusCode, code, details) — matching the
 * way callers naturally read errors ("message first, then the metadata").
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT', undefined)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSec?: number
  constructor(message = 'Too many requests', retryAfterSec?: number) {
    super(message, 429, 'RATE_LIMITED', { retryAfterSec })
    this.name = 'RateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
