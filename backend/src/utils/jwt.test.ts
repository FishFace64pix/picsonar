import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  verifyAuthHeader,
} from './jwt'

describe('jwt', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken('user-1', 'user')
    const payload = verifyToken(token)
    expect(payload?.userId).toBe('user-1')
    expect(payload?.role).toBe('user')
  })

  it('rejects tampered tokens', () => {
    const token = signAccessToken('user-1', 'user')
    const bad = token.slice(0, -4) + 'XXXX'
    expect(verifyToken(bad)).toBeNull()
  })

  it('rejects access tokens as refresh tokens', () => {
    const access = signAccessToken('user-1', 'user')
    expect(verifyRefreshToken(access)).toBeNull()
  })

  it('accepts refresh tokens via verifyRefreshToken', () => {
    const refresh = signRefreshToken('user-1')
    const payload = verifyRefreshToken(refresh)
    expect(payload?.userId).toBe('user-1')
  })

  it('refresh tokens carry a unique jti and exp', () => {
    const a = verifyRefreshToken(signRefreshToken('user-1'))
    const b = verifyRefreshToken(signRefreshToken('user-1'))
    expect(a?.jti).toBeTruthy()
    expect(b?.jti).toBeTruthy()
    expect(a?.jti).not.toBe(b?.jti)
    expect(typeof a?.exp).toBe('number')
    expect((a?.exp ?? 0) > Math.floor(Date.now() / 1000)).toBe(true)
  })

  it('extracts and verifies Authorization: Bearer headers', () => {
    const token = signAccessToken('user-1', 'admin')
    expect(verifyAuthHeader(`Bearer ${token}`)?.role).toBe('admin')
    expect(verifyAuthHeader(`bearer ${token}`)?.role).toBe('admin')
    expect(verifyAuthHeader(undefined)).toBeNull()
    expect(verifyAuthHeader('')).toBeNull()
    expect(verifyAuthHeader('Bearer')).toBeNull()
  })
})
