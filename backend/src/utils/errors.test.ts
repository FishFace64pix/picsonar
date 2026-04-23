import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ValidationError,
  isAppError,
} from './errors'

describe('errors', () => {
  it('AppError carries code + statusCode', () => {
    const e = new AppError('x', 418, 'TEAPOT')
    expect(e.statusCode).toBe(418)
    expect(e.code).toBe('TEAPOT')
    expect(isAppError(e)).toBe(true)
    expect(isAppError(new Error('plain'))).toBe(false)
  })

  it('Typed subclasses map to proper status codes', () => {
    expect(new ValidationError('x').statusCode).toBe(400)
    expect(new AuthError('x').statusCode).toBe(401)
    expect(new ForbiddenError('x').statusCode).toBe(403)
    expect(new NotFoundError('x').statusCode).toBe(404)
    expect(new ConflictError('x').statusCode).toBe(409)
    expect(new RateLimitError('x', 30).statusCode).toBe(429)
  })

  it('RateLimitError exposes retryAfter seconds', () => {
    const e = new RateLimitError('slow down', 45)
    expect(e.details).toMatchObject({ retryAfterSec: 45 })
  })
})
