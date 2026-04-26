/**
 * Single source of truth for domain entities.
 * Imported by both backend and frontend.
 */

export type UserRole = 'user' | 'admin'
export type SubscriptionStatus = 'active' | 'inactive' | 'trial'
export type EventStatus = 'active' | 'processing' | 'completed' | 'archived'
export type OrderStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'
export type InvoiceStatus = 'pending' | 'issued' | 'failed'
export type InvoiceProvider = 'smartbill' | 'oblio' | 'manual'

export interface CompanyDetails {
  companyName: string
  cui: string // digits only, no RO prefix
  hasROPrefix?: boolean
  vatPayer: boolean
  regCom?: string

  country: string
  city: string
  street: string
  postalCode: string

  bank?: string
  iban?: string

  billingEmail: string
  phone?: string

  /** @deprecated use structured fields above */
  address?: string

  logoUrl?: string
  logoKey?: string
}

export interface User {
  userId: string
  email: string
  name: string
  phone?: string
  role: UserRole
  subscriptionStatus: SubscriptionStatus
  /** @deprecated Use credits_* fields for new purchases. Kept for legacy users. */
  eventCredits: number
  /** Per-package credits — populated for all purchases made after the per-package system launch. */
  credits_starter?: number
  credits_studio?: number
  credits_agency?: number
  credits_extra_event?: number
  limits?: {
    maxPhotosPerEvent: number
  }
  companyDetails?: CompanyDetails
  plan?: string
  /**
   * True once the user clicks the verification link we email at signup.
   * Gated endpoints (payments, event creation) refuse to run until this
   * flips true.
   */
  emailVerified?: boolean
  /** ISO-8601 */
  emailVerifiedAt?: string
  /** ISO-8601 */
  createdAt: string
  /** ISO-8601 */
  updatedAt: string
}

export interface Event {
  eventId: string
  userId: string
  eventName: string
  /** ISO-8601 */
  createdAt: string
  status: EventStatus
  totalPhotos: number
  totalFaces: number
  organizerLogo?: string
}

export interface Photo {
  photoId: string
  eventId: string
  s3Key: string
  s3Url?: string // presigned
  thumbnailUrl?: string
  faces: string[]
  /** ISO-8601 */
  uploadedAt: string
  sizeBytes?: number
  width?: number
  height?: number
}

export interface Face {
  faceId: string
  eventId: string
  rekognitionFaceId: string
  samplePhotoUrl: string
  associatedPhotos: string[]
  qrCodeUrl?: string
}

export interface Order {
  orderId: string
  userId: string
  /** Integer minor units (e.g. bani for RON, cents for USD). NEVER float. */
  amountMinor: number
  currency: string
  packageId: string
  status: OrderStatus
  /** ISO-8601 */
  createdAt: string

  paymentIntentId: string
  paymentProvider: 'stripe' | 'netopia'

  invoiceSnapshot?: CompanyDetails
  invoiceStatus: InvoiceStatus
  invoiceNumber?: string
  invoicePdfUrl?: string
  invoiceProvider?: InvoiceProvider
  invoiceErrorMessage?: string
  invoiceIssuedAt?: string

  description?: string
}

export interface FaceMatchResult {
  faceId: string
  confidence: number
  photos: Photo[]
}

export interface UploadProgress {
  file: File
  progress: number
  status:
    | 'pending'
    | 'compressing'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'error'
  error?: string
}

export interface JwtPayload {
  userId: string
  role: UserRole
  iat?: number
  exp?: number
}
