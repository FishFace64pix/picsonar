/**
 * In-memory access-token store.
 *
 * Why not localStorage?
 *   - localStorage is readable by any script that runs in the page, so a
 *     single XSS bug exfiltrates the JWT.
 *   - Keeping the token in a module-scoped variable means it lives only in
 *     the current JS heap. On hard refresh the user is signed out — an
 *     acceptable trade until backend httpOnly refresh-cookies are wired.
 *
 * A subscribe() hook is provided so the axios interceptor can pull the
 * current token synchronously on every request.
 */
type Listener = (token: string | null) => void

let accessToken: string | null = null
let refreshToken: string | null = null
const listeners = new Set<Listener>()

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  return refreshToken
}

export function setTokens(next: {
  accessToken: string | null
  refreshToken?: string | null
}): void {
  accessToken = next.accessToken
  if (next.refreshToken !== undefined) refreshToken = next.refreshToken
  listeners.forEach((l) => l(accessToken))
}

export function clearTokens(): void {
  setTokens({ accessToken: null, refreshToken: null })
}

export function subscribeToToken(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
