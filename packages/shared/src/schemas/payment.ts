import { z } from 'zod'

export const CreatePaymentIntentSchema = z.object({
  packageId: z.enum(['starter', 'studio', 'agency', 'extra_event']),
  billingEmail: z.string().email().optional(),
})

export const VerifyPaymentSchema = z.object({
  paymentIntentId: z.string().min(4).max(200),
})

export const CreateOrderSchema = z.object({
  packageId: z.enum(['starter', 'studio', 'agency', 'extra_event']),
  amountMinor: z.number().int().positive(),
  currency: z.literal('RON'),
  paymentIntentId: z.string().min(4).max(200),
})

export type CreatePaymentIntentInput = z.infer<
  typeof CreatePaymentIntentSchema
>
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
