import { z } from "zod";

export const LegalSectionSchema = z.object({
  id: z
    .string()
    .min(1, "Section ID is required")
    .regex(/^[a-z0-9-]+$/, "Section ID must be lowercase kebab-case (e.g. anonymity, assistant-terms)"),
  heading: z.string().min(1, "Heading is required"),
  filterMode: z.enum(["all", "contact", "assistant", "whatsapp"]),
  contentMarkdown: z.string().min(1, "Content cannot be empty"),
  order: z.number().int().nonnegative(),
});

export const SaveDraftSchema = z.object({
  docType: z.enum(["TERMS", "PRIVACY"]),
  version: z.string().min(1, "Version is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  lastUpdatedDate: z.string().min(1, "Last updated date is required"),
  changeSummary: z.string().default(""),
  isMaterialChange: z.boolean().default(false),
  sections: z.array(LegalSectionSchema).min(1, "At least one section is required"),
});

export const DiscardDraftSchema = z.object({
  docType: z.enum(["TERMS", "PRIVACY"]),
});

export const PublishDocumentSchema = z.object({
  docType: z.enum(["TERMS", "PRIVACY"]),
  expectedVersion: z.number().int().nonnegative(),
  version: z
    .string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+\.\d+$/, "Version must follow semantic format (e.g. 1.0.0, 1.1.0)"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  lastUpdatedDate: z.string().min(1, "Last updated date is required"),
  changeSummary: z.string().optional().default(""),
  isMaterialChange: z.boolean().default(false),
  sections: z.array(LegalSectionSchema).min(1, "At least one section is required"),
});

export const RestoreVersionSchema = z.object({
  docType: z.enum(["TERMS", "PRIVACY"]),
  historyId: z.string().min(1, "History record ID is required"),
});

export const RetryJobSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

export type LegalSectionInput = z.infer<typeof LegalSectionSchema>;
export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export type DiscardDraftInput = z.infer<typeof DiscardDraftSchema>;
export type PublishDocumentInput = z.infer<typeof PublishDocumentSchema>;
export type RestoreVersionInput = z.infer<typeof RestoreVersionSchema>;
export type RetryJobInput = z.infer<typeof RetryJobSchema>;
