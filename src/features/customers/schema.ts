import { z } from 'zod'

export const customerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  mobileNumber: z
    .string()
    .min(7, 'Enter a valid mobile number')
    .regex(/^[0-9+\-\s]+$/, 'Only digits and + - are allowed'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  referenceBy: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
