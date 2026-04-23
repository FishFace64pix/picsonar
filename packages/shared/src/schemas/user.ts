import { z } from 'zod'

export const AdminManageUserSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['disable', 'enable', 'delete', 'promote', 'demote']),
  reason: z.string().max(500).optional(),
})

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

export type AdminManageUserInput = z.infer<typeof AdminManageUserSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
