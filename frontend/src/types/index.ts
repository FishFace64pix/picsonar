export interface CompanyDetails {
  // Core company information
  companyName: string;
  cui: string; // Normalized (digits only)
  hasROPrefix?: boolean; // Whether original input had "RO" prefix
  vatPayer: boolean;
  regCom?: string; // Optional: J40/1234/2020

  // Structured billing address (mandatory for B2B invoicing)
  country: string;
  city: string;
  street: string;
  postalCode: string;

  // Banking information (optional)
  bank?: string;
  iban?: string;

  // Invoice email (mandatory for B2B)
  billingEmail: string;

  // Legacy/deprecated: kept for backward compatibility
  address?: string; // Now replaced by structured fields above

  // Logo (optional)
  logoUrl?: string; // Signed URL for display
  logoKey?: string; // S3 Key for storage
}

export interface User {
  userId: string
  email: string
  name: string
  subscriptionStatus: 'active' | 'inactive' | 'trial'
  eventCredits: number
  limits?: {
    maxPhotosPerEvent: number
  }
  companyDetails?: CompanyDetails
  plan?: string
  role?: string
}

export interface Order {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  packageId: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  createdAt: string;

  // Payment provider references
  paymentIntentId: string;

  // Invoice snapshot (IMMUTABLE copy of billing data at purchase time)
  // This ensures historical invoices remain unchanged even if user updates their profile
  invoiceSnapshot: CompanyDetails;

  // Invoice metadata and status tracking
  invoiceStatus: 'pending' | 'issued' | 'failed';
  invoiceNumber?: string; // Format: INV-2025-001
  invoicePdfUrl?: string; // S3 signed URL or external provider URL
  invoiceProvider?: 'smartbill' | 'oblio' | 'manual';
  invoiceErrorMessage?: string; // Error details if invoice generation failed
  invoiceIssuedAt?: string; // ISO timestamp when invoice was successfully issued

  // Legacy field for backward compatibility
  description?: string;

  // For admin view (hydrated from UsersTable)
  user?: User;
}

export interface Event {
  eventId: string
  userId: string
  eventName: string
  createdAt: string
  status: 'active' | 'processing' | 'completed'
  totalPhotos: number
  totalFaces: number
  organizerLogo?: string
}

export interface Photo {
  photoId: string
  eventId: string
  s3Url: string
  thumbnailUrl?: string
  s3Key?: string
  faces: string[]
  uploadedAt: string
}

export interface Face {
  faceId: string
  eventId: string
  rekognitionFaceId: string
  samplePhotoUrl: string
  associatedPhotos: string[]
  qrCodeUrl?: string
}

export interface FaceMatchResult {
  faceId: string
  confidence: number
  photos: Photo[]
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

