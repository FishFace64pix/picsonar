import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  subscribeToToken,
} from './tokenStore'

describe('tokenStore', () => {
  beforeEach(() => {
    clearTokens()
  })

  it('starts with null tokens', () => {
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('setTokens sets both access and refresh tokens', () => {
    setTokens({ accessToken: 'a.b.c', refreshToken: 'r.e.f' })
    expect(getAccessToken()).toBe('a.b.c')
    expect(getRefreshToken()).toBe('r.e.f')
  })

  it('setTokens without refreshToken leaves existing refresh intact', () => {
    setTokens({ accessToken: 'a.b.c', refreshToken: 'r.e.f' })
    setTokens({ accessToken: 'new.access' })
    expect(getAccessToken()).toBe('new.access')
    expect(getRefreshToken()).toBe('r.e.f')
  })

  it('clearTokens wipes both tokens', () => {
    setTokens({ accessToken: 'a.b.c', refreshToken: 'r.e.f' })
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('subscribeToToken fires on every setTokens', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToToken(listener)
    setTokens({ accessToken: 'one' })
    setTokens({ accessToken: 'two' })
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(1, 'one')
    expect(listener).toHaveBeenNthCalledWith(2, 'two')
    unsubscribe()
    setTokens({ accessToken: 'three' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('clearTokens notifies subscribers with null', () => {
    const listener = vi.fn()
    subscribeToToken(listener)
    setTokens({ accessToken: 'x' })
    listener.mockClear()
    clearTokens()
    expect(listener).toHaveBeenCalledWith(null)
  })
})
