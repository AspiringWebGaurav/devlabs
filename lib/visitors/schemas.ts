import { z } from "zod";

export const ViewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  colorScheme: z.enum(["light", "dark"]),
  touch: z.boolean(),
});

export const BeaconPayloadSchema = z.object({
  currentPath: z.string().min(1).max(500),
  referrer: z.string().max(1000).optional(),
  viewport: ViewportSchema.optional(),
  machineHash: z.string().max(128).optional(),
});

export const BanVisitorSchema = z.object({
  visitorId: z.string().min(4).max(64),
  reason: z.string().min(1).max(500).default("Access permanently revoked by administrator"),
});

export const UnbanVisitorSchema = z.object({
  visitorId: z.string().min(4).max(64),
});

export const DeleteVisitorSchema = z.object({
  visitorId: z.string().min(4).max(64),
});
