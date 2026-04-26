import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestResetSchema = z.object({ email: emailSchema });
export const updatePasswordSchema = z.object({
  password: passwordSchema,
});
