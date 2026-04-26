import { z } from "zod";

export const handleSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters")
  .max(24, "Handle must be 24 characters or fewer")
  .regex(/^[a-z0-9_]+$/i, "Handles can only contain letters, numbers, and underscores");

export const profileSchema = z.object({
  handle: handleSchema,
  display_name: z.string().min(1).max(60).optional().or(z.literal("")),
  bio: z.string().max(280).optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
