/**
 * Password hashing — bcryptjs cost 12.
 * Replaces the previous SHA-256-without-salt implementation.
 */
import bcrypt from 'bcryptjs'

const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length < 8) {
    throw new Error('password must be at least 8 chars')
  }
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

/**
 * Used by the one-time migration script that converts legacy SHA-256 hashes.
 * Pre-launch we don't have real users, so this is a no-op stub — kept for tests.
 */
export function isLegacySha256Hash(hash: string): boolean {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)
}
