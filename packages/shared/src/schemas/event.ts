import { z } from 'zod'

export const CreateEventSchema = z.object({
  eventName: z.string().min(2).max(120),
  eventDate: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
})

export const UpdateEventSchema = z.object({
  eventName: z.string().min(2).max(120).optional(),
  status: z.enum(['active', 'processing', 'completed', 'archived']).optional(),
})

export const EventIdParam = z.object({
  eventId: z.string().uuid(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>
