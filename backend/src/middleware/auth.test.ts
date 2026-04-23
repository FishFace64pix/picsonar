import type { APIGatewayProxyEvent } from 'aws-lambda'
import { signAccessToken } from '../utils/jwt'
import { requireAuth, requireAdmin, tryAuth } from './auth'

function buildEvent(headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return {
    headers,
    multiValueHeaders: {},
    body: null,
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/x',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '/x',
  }
}

describe('requireAuth', () => {
  it('rejects missing auth header', () => {
    expect(() => requireAuth(buildEvent())).toThrow(/authorization/i)
  })

  it('rejects invalid tokens', () => {
    expect(() =>
      requireAuth(buildEvent({ Authorization: 'Bearer not-a-jwt' })),
    ).toThrow()
  })

  it('accepts a valid user JWT', () => {
    const token = signAccessToken('user-1', 'user')
    const payload = requireAuth(buildEvent({ Authorization: `Bearer ${token}` }))
    expect(payload.userId).toBe('user-1')
    expect(payload.role).toBe('user')
  })

  it('requireAdmin blocks non-admin', () => {
    const token = signAccessToken('user-1', 'user')
    expect(() =>
      requireAdmin(buildEvent({ Authorization: `Bearer ${token}` })),
    ).toThrow(/admin/i)
  })

  it('requireAdmin accepts admin role', () => {
    const token = signAccessToken('user-1', 'admin')
    const payload = requireAdmin(
      buildEvent({ Authorization: `Bearer ${token}` }),
    )
    expect(payload.role).toBe('admin')
  })

  it('tryAuth never throws', () => {
    expect(tryAuth(buildEvent())).toBeNull()
  })
})
