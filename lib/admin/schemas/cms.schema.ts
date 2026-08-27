import { z } from "zod";

// ============================================================================
// 1. HERO SCHEMA
// ============================================================================
export const HeroUpdateSchema = z.object({
  eyebrow: z.string().min(1).max(100),
  headingWords: z.string().min(1).max(250),
  description: z.string().min(1).max(500),
  ctaTitle: z.string().min(1).max(60),
  ctaLink: z.string().min(1).max(200),
  scrollText: z.string().min(1).max(50),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type HeroUpdateInput = z.infer<typeof HeroUpdateSchema>;

// ============================================================================
// 2. BENTO CARDS SCHEMA
// ============================================================================
export const BentoCardUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(""),
  img: z.string().optional().or(z.literal("")),
  spareImg: z.string().optional().or(z.literal("")),
  techStackLeft: z.array(z.string()).optional(),
  techStackRight: z.array(z.string()).optional(),
  ctaEmail: z.string().email().optional().or(z.literal("")),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type BentoCardUpdateInput = z.infer<typeof BentoCardUpdateSchema>;

// ============================================================================
// 3. PROJECTS SCHEMA
// ============================================================================
export const ProjectSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(500),
  coverImage: z.string().min(1),
  coverImageStoragePath: z.string().default(""),
  iconLists: z.array(z.string()).default([]),
  liveUrl: z.string().url().regex(/^https:\/\//, "Must be a secure HTTPS URL"),
  githubUrl: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\//, "Must be a GitHub URL")
    .optional()
    .or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

// ============================================================================
// 4. TESTIMONIALS SCHEMA
// ============================================================================
export const TestimonialSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(150),
  company: z.string().max(100).default(""),
  quote: z.string().min(10).max(1000),
  avatarUrl: z.string().optional().or(z.literal("")),
  avatarStoragePath: z.string().optional().or(z.literal("")),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type TestimonialInput = z.infer<typeof TestimonialSchema>;

// ============================================================================
// 5. CLIENT LOGOS SCHEMA
// ============================================================================
export const ClientSchema = z.object({
  name: z.string().min(1).max(100),
  iconUrl: z.string().min(1),
  iconStoragePath: z.string().default(""),
  nameImgUrl: z.string().min(1),
  nameImgStoragePath: z.string().default(""),
  websiteUrl: z.string().url().regex(/^https:\/\//, "Must be a secure HTTPS URL").optional().or(z.literal("")),
  logoWidth: z.coerce.number().int().min(20).max(300).default(50),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

// ============================================================================
// 6. WORK EXPERIENCE SCHEMA
// ============================================================================
export const ExperienceSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(500),
  company: z.string().max(100).optional().or(z.literal("")),
  period: z.string().max(50).optional().or(z.literal("")),
  thumbnailUrl: z.string().min(1),
  thumbnailStoragePath: z.string().default(""),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type ExperienceInput = z.infer<typeof ExperienceSchema>;

// ============================================================================
// 7. PROCESS PHASES SCHEMA
// ============================================================================
export const PhaseSchema = z.object({
  phaseBadge: z.string().min(1).max(50),
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(500),
  themeColor: z.enum(["emerald", "pink", "sky", "violet", "amber"]).default("emerald"),
  animationSpeed: z.coerce.number().finite().min(0.1).max(10.0).default(3.0),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type PhaseInput = z.infer<typeof PhaseSchema>;

// ============================================================================
// 8. NAVIGATION SCHEMA
// ============================================================================
export const NavItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  link: z.string().min(1).max(100),
  order: z.number().int(),
  isVisible: z.boolean().default(true),
});

export const NavigationUpdateSchema = z.object({
  items: z.array(NavItemSchema),
  expectedVersion: z.number().int().optional(),
});

export type NavigationUpdateInput = z.infer<typeof NavigationUpdateSchema>;

// ============================================================================
// 9. CTA SCHEMA
// ============================================================================
export const CtaUpdateSchema = z.object({
  headingPrefix: z.string().max(100).default("Ready to take "),
  headingHighlight: z.string().max(50).default("your"),
  headingSuffix: z.string().max(100).default(" digital presence to the next level?"),
  description: z.string().min(1).max(500),
  buttonText: z.string().min(1).max(60),
  isEnabled: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type CtaUpdateInput = z.infer<typeof CtaUpdateSchema>;

// ============================================================================
// 10. FOOTER SCHEMA
// ============================================================================
export const FooterUpdateSchema = z.object({
  copyrightName: z.string().min(1).max(100),
  termsUrl: z.string().min(1).max(200),
  privacyUrl: z.string().min(1).max(200),
  expectedVersion: z.number().int().optional(),
});

export type FooterUpdateInput = z.infer<typeof FooterUpdateSchema>;

// ============================================================================
// 11. SOCIAL LINKS SCHEMA
// ============================================================================
export const SocialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  url: z.string().url().regex(/^https:\/\//, "Must be a secure HTTPS URL"),
  iconType: z.enum(["preset", "custom_path"]).default("preset"),
  presetName: z.enum(["github", "twitter", "linkedin"]).optional(),
  customPathD: z
    .string()
    .regex(/^[mMzZlLhHvVcCsSqQtTaAeE0-9\s,.-]+$/, "Must be valid SVG path 'd' coordinate commands")
    .optional()
    .or(z.literal("")),
  isPublished: z.boolean().default(true),
  expectedVersion: z.number().int().optional(),
});

export type SocialLinkInput = z.infer<typeof SocialLinkSchema>;

// ============================================================================
// 12. SEO SCHEMA
// ============================================================================
export const SeoUpdateSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(300),
  canonicalUrl: z.string().url().regex(/^https:\/\//, "Must be a secure HTTPS URL"),
  ogImageUrl: z.string().optional().or(z.literal("")),
  ogImageStoragePath: z.string().optional().or(z.literal("")),
  keywords: z.array(z.string()).default([]),
  author: z.string().min(1).max(100),
  twitterHandle: z.string().max(50).optional().or(z.literal("")),
  expectedVersion: z.number().int().optional(),
});

export type SeoUpdateInput = z.infer<typeof SeoUpdateSchema>;

// ============================================================================
// REORDER & BATCH REORDER SCHEMA
// ============================================================================
export const ReorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export type ReorderInput = z.infer<typeof ReorderSchema>;
