import { z } from "zod";

/**
 * Standard pagination query parameters schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;

/**
 * Standard date range filter schema
 */
export const DateRangeFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;

/**
 * Standard sorting schema
 */
export const SortOrderSchema = z.enum(["asc", "desc"]).default("desc");
export type SortOrder = z.infer<typeof SortOrderSchema>;
