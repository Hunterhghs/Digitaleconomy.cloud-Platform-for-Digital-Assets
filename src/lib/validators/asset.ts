import { z } from "zod";
import { ASSET_LICENSES } from "@/lib/site";

const licenseIds = ASSET_LICENSES.map((l) => l.id) as [string, ...string[]];

export const assetMetaSchema = z.object({
  title: z
    .string()
    .min(2, "Title is too short")
    .max(120, "Title must be 120 characters or fewer"),
  description: z
    .string()
    .max(4_000, "Description must be 4,000 characters or fewer")
    .optional()
    .or(z.literal("")),
  category_id: z.string().uuid("Pick a category").nullable().optional(),
  license: z.enum(licenseIds, { message: "Pick a license" }),
  tags: z
    .array(z.string().min(1).max(32))
    .max(15, "Maximum of 15 tags")
    .optional()
    .default([]),
  status: z.enum(["draft", "published"]).default("published"),
});

export type AssetMetaInput = z.infer<typeof assetMetaSchema>;

export const updateAssetSchema = assetMetaSchema.extend({
  id: z.string().uuid(),
});

export const reportSchema = z.object({
  asset_id: z.string().uuid(),
  reason: z.enum(
    ["copyright", "spam", "harmful", "illegal", "csam", "personal_info", "other"],
    { message: "Pick a reason" },
  ),
  details: z.string().max(2_000).optional().or(z.literal("")),
});

export type ReportInput = z.infer<typeof reportSchema>;
