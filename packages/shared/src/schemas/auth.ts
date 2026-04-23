import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

/** Romanian mobile phone: +407xxxxxxxx or 07xxxxxxxx */
const RO_PHONE_RE = /^(\+40|0)7[0-9]{8}$/

export const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128)
    .refine((s) => /[A-Z]/.test(s), 'Must contain an uppercase letter')
    .refine((s) => /[a-z]/.test(s), 'Must contain a lowercase letter')
    .refine((s) => /\d/.test(s), 'Must contain a digit'),
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(RO_PHONE_RE, 'Invalid Romanian phone (+407xxxxxxxx or 07xxxxxxxx)'),
  legal: z
    .object({
      termsAccepted: z.boolean(),
      privacyAccepted: z.boolean(),
      dpaAccepted: z.boolean().optional(),
      /**
       * Per Romanian consumer protection law (OUG 34/2014), buyers of
       * digital services have a 14-day right of withdrawal (drept de
       * retragere). That right is waived if — and only if — the buyer
       * explicitly consents in writing to immediate service delivery.
       * We store this consent (with timestamp, IP, and UA) so ANPC
       * complaints can be defended.
       *
       * Labeled in RO UX:
       *   "Sunt de acord ca serviciul să înceapă imediat și înțeleg
       *    că îmi pierd dreptul de retragere de 14 zile."
       */
      immediateDeliveryConsent: z.boolean(),
    })
    .refine(
      (l) =>
        l.termsAccepted && l.privacyAccepted && l.immediateDeliveryConsent,
      {
        message:
          'Terms, Privacy Policy, and immediate-delivery consent must all be accepted',
      },
    ),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: z
    .string()
    .min(10)
    .max(128)
    .refine((s) => /[A-Z]/.test(s))
    .refine((s) => /[a-z]/.test(s))
    .refine((s) => /\d/.test(s)),
})

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(30).optional(),
  companyDetails: z
    .object({
      companyName: z.string().min(2).max(200),
      cui: z.string().min(2).max(12),
      hasROPrefix: z.boolean().optional(),
      vatPayer: z.boolean(),
      regCom: z.string().max(50).optional(),
      country: z.string().min(2).max(100),
      city: z.string().min(2).max(100),
      street: z.string().min(2).max(200),
      postalCode: z.string().min(2).max(20),
      bank: z.string().max(100).optional(),
      iban: z.string().max(34).optional(),
      billingEmail: z.string().email(),
      phone: z.string().min(6).max(30).optional(),
    })
    .optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
