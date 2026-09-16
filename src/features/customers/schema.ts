import { z } from 'zod'

// confirmPassword is form-only — stripped before the request is sent (see
// CustomerFormDialog.tsx) — it just makes the two password fields match here.
export const customerSchema = z
  .object({
    companyName: z.string().min(1, 'Company name is required'),
    mobileNumber: z
      .string()
      .min(7, 'Enter a valid mobile number')
      .regex(/^[0-9+\-\s]+$/, 'Only digits and + - are allowed'),
    // Optional: leave blank when editing to keep the existing password. Min 6 when set.
    password: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
    city: z.string().min(1, 'City is required'),
  })
  .refine((values) => !values.password || values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type CustomerFormValues = z.infer<typeof customerSchema>
