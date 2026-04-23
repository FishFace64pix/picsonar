/**
 * Package catalog — the single source of truth.
 * Money stored as integer minor units (bani) to avoid float drift.
 * 1 RON = 100 bani.
 */

export interface PackageDefinition {
  id: PackageId
  name: string
  /** Credits added to the user's balance after purchase. */
  credits: number
  /** Price in bani (RON * 100). */
  priceMinor: number
  currency: 'RON'
  billingPeriod: 'one-time' | 'monthly' | 'yearly'
  limits: {
    photoLimitPerEvent: number
    storageMonths: number
  }
  popular?: boolean
}

export type PackageId = 'starter' | 'studio' | 'agency' | 'extra_event'

export const PACKAGES: Record<PackageId, PackageDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 1,
    priceMinor: 14_900, // 149 RON
    currency: 'RON',
    billingPeriod: 'one-time',
    limits: { photoLimitPerEvent: 1000, storageMonths: 2 },
    popular: false,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    credits: 4,
    priceMinor: 79_900, // 799 RON
    currency: 'RON',
    billingPeriod: 'one-time',
    limits: { photoLimitPerEvent: 2500, storageMonths: 6 },
    popular: true,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    credits: 12,
    priceMinor: 249_900, // 2499 RON
    currency: 'RON',
    billingPeriod: 'one-time',
    limits: { photoLimitPerEvent: 5000, storageMonths: 12 },
    popular: false,
  },
  extra_event: {
    id: 'extra_event',
    name: 'Extra Event',
    credits: 1,
    priceMinor: 19_900, // 199 RON
    currency: 'RON',
    billingPeriod: 'one-time',
    limits: { photoLimitPerEvent: 3000, storageMonths: 6 },
  },
}

export const ALL_PACKAGES: PackageDefinition[] = Object.values(PACKAGES)

export const getPackage = (id: string): PackageDefinition | undefined =>
  PACKAGES[id as PackageId]

/** Face matching & upload quotas. */
export const QUOTA = {
  MAX_PHOTO_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_FACE_BYTES: 5 * 1024 * 1024, // 5 MB
  FACE_MATCH_THRESHOLD: 85, // Rekognition similarity %
  MATCH_PER_MINUTE: 10, // rate limit (per IP / event)
} as const

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]
