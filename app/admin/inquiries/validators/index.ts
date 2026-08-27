import { z } from "zod";

export const InquiryFilterSchema = z.object({
  status: z.enum(["unread", "read", "archived", "all"]).default("all"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const InquiryStatusUpdateSchema = z.object({
  id: z.string().min(1, "Inquiry ID is required"),
  status: z.enum(["unread", "read", "archived"]),
});

export const ReplyInquirySchema = z.object({
  id: z.string().optional(),
  toEmail: z.string().email("Valid recipient email address is required"),
  toName: z.string().optional(),
  subject: z.string().min(1, "Email subject is required").max(200, "Subject must be under 200 characters"),
  message: z.string().min(5, "Reply message must be at least 5 characters").max(5000, "Message must be under 5000 characters"),
});

