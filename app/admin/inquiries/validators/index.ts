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
