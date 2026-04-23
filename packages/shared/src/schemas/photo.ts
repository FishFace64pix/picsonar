import { z } from 'zod'
import { ALLOWED_MIME_TYPES, QUOTA } from '../constants'

export const UploadPhotoSchema = z.object({
  eventId: z.string().uuid(),
  contentType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(QUOTA.MAX_PHOTO_BYTES, `Max ${QUOTA.MAX_PHOTO_BYTES} bytes`),
  fileName: z.string().max(255),
})

export const DeletePhotoSchema = z.object({
  eventId: z.string().uuid(),
  photoId: z.string().uuid(),
})

export const DeletePhotosSchema = z.object({
  eventId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(100),
})

/** Body-only variant used when eventId comes from the path. */
export const DeletePhotosBodySchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(100),
})

export const MatchFaceSchema = z.object({
  eventId: z.string().uuid(),
  contentType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(QUOTA.MAX_FACE_BYTES),
})

export type UploadPhotoInput = z.infer<typeof UploadPhotoSchema>
export type DeletePhotoInput = z.infer<typeof DeletePhotoSchema>
export type DeletePhotosInput = z.infer<typeof DeletePhotosSchema>
export type MatchFaceInput = z.infer<typeof MatchFaceSchema>
