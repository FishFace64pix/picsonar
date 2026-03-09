import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const TOKEN_TTL = '24h'

export interface JwtPayload {
    userId: string
    role: string
    iat?: number
    exp?: number
}

/**
 * Signs a new JWT for the given user.
 * @param userId  DynamoDB userId (UUID)
 * @param role    'user' | 'admin'
 * @returns signed JWT string (24h expiry)
 */
export function signToken(userId: string, role: string = 'user'): string {
    return jwt.sign({ userId, role }, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: TOKEN_TTL,
    })
}

/**
 * Verifies a JWT and returns the payload.
 * Returns null if the token is invalid, expired, or tampered.
 * @param token  raw token string (without "Bearer " prefix)
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
        return payload
    } catch (err: any) {
        console.warn('JWT verification failed:', err.message)
        return null
    }
}

/**
 * Extracts and verifies the JWT from an Authorization header.
 * Accepts "Bearer <token>" format.
 * Returns the payload or null.
 */
export function verifyAuthHeader(authHeader: string | undefined): JwtPayload | null {
    if (!authHeader) return null
    const token = authHeader.replace(/^Bearer\s+/i, '')
    return verifyToken(token)
}
