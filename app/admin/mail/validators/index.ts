import { z } from "zod";

export const MailRecipientSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address format.")
    .max(120, "Email must be under 120 characters.")
    .refine((val) => !/[\r\n]/.test(val), "Email must not contain newline characters."),
  name: z
    .string()
    .trim()
    .max(60, "Recipient name must be under 60 characters.")
    .refine((val) => !/[\r\n]/.test(val), "Name must not contain newline characters.")
    .optional(),
});

export const SendMailSchema = z
  .object({
    idempotencyKey: z.string().min(10, "Invalid idempotency key format.").max(64),
    draftId: z.string().max(64).optional(),
    senderKey: z.enum(["SECURITY", "HELP", "HELLO", "NO_REPLY"]),
    to: z
      .array(MailRecipientSchema)
      .min(1, "At least one 'To' recipient is required.")
      .max(50, "Maximum 50 recipients permitted per email."),
    cc: z.array(MailRecipientSchema).max(50).optional(),
    bcc: z.array(MailRecipientSchema).max(50).optional(),
    subject: z
      .string()
      .trim()
      .min(1, "Subject line is required.")
      .max(200, "Subject must be under 200 characters.")
      .refine((val) => !/[\r\n]/.test(val), "Subject must not contain newline characters."),
    body: z
      .string()
      .trim()
      .min(1, "Message content is required.")
      .max(10000, "Message content must be under 10,000 characters."),
  })
  .refine(
    (data) => {
      const totalRecipients = data.to.length + (data.cc?.length || 0) + (data.bcc?.length || 0);
      return totalRecipients <= 50;
    },
    {
      message: "Total combined recipients (To + CC + BCC) cannot exceed 50.",
      path: ["to"],
    }
  );

export const SaveDraftSchema = z.object({
  id: z.string().max(64).optional(),
  senderKey: z.enum(["SECURITY", "HELP", "HELLO", "NO_REPLY"]).default("HELLO"),
  to: z.array(MailRecipientSchema).default([]),
  cc: z.array(MailRecipientSchema).default([]),
  bcc: z.array(MailRecipientSchema).default([]),
  subject: z.string().trim().max(200).default(""),
  body: z.string().max(10000).default(""),
});

export const MailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
