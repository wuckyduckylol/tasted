import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, '3–20 characters; letters, numbers and _ only'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** US phone: accepts any formatting, normalizes to E.164 (+1XXXXXXXXXX). */
export const phoneSchema = z
  .string()
  .transform((raw) => raw.replace(/\D/g, ''))
  .transform((digits) => (digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits))
  .refine((digits) => digits.length === 10, 'Enter a 10-digit US phone number')
  .transform((digits) => `+1${digits}`);

// Supabase OTP length is a project setting (6–10 digits); accept the range.
export const otpSchema = z.string().trim().regex(/^\d{6,10}$/, 'Enter the code from your email');

export const emailStepSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const passwordStepSchema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
});

export const nameSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(40, 'Keep it under 40 characters'),
  lastName: z.string().trim().min(1, 'Enter your last name').max(40, 'Keep it under 40 characters'),
});

export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, '3–20 characters; letters, numbers and _ only'),
});

/** First zod issue message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
