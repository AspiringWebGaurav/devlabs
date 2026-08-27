import type { ReactNode } from "react";

// ============================================================================
// 1. LEGACY COMPATIBILITY INTERFACES
// ============================================================================

export interface NavItem {
  name: string;
  link: string;
  icon?: ReactNode;
}

export interface GridItem {
  id: number;
  title: string;
  description: string;
  className: string;
  imgClassName: string;
  titleClassName: string;
  img: string;
  spareImg: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  des: string;
  img: string;
  iconLists: string[];
  link: string;
}

export interface TestimonialItem {
  quote: string;
  name: string;
  title: string;
}

export interface CompanyItem {
  id: number;
  name: string;
  img: string;
  nameImg: string;
}

export interface WorkExperienceItem {
  id: number;
  title: string;
  desc: string;
  className: string;
  thumbnail: string;
}

export interface SocialMediaItem {
  id: number;
  img: string;
  link: string;
}

// ============================================================================
// 2. 12 PUBLIC CMS CONTENT DOMAINS (FIRESTORE MODELS)
// ============================================================================

// 1. Hero Singleton (Collection: portfolio_hero, Doc: hero_main)
export interface HeroDocument {
  id: "hero_main";
  eyebrow: string;
  headingWords: string;
  description: string;
  ctaTitle: string;
  ctaLink: string;
  scrollText: string;
  isPublished: boolean;
  updatedAt: string;
  version: number;
}

// 2. Bento Grid Cards (Collection: portfolio_cards, Docs: card_01 to card_06)
export type BentoCardType =
  | "collaboration"
  | "globe_timezone"
  | "tech_stack"
  | "passion"
  | "current_project"
  | "contact_cta";

export type BentoGridSpanVariant = "span_default" | "span_wide" | "span_full";
export type BentoVisualLayout =
  | "image_bottom"
  | "image_right"
  | "centered_text"
  | "globe_canvas"
  | "tech_pills";

export interface BentoCardDocument {
  id: string; // "card_01" .. "card_06"
  slotIndex: number; // 1 .. 6
  cardType: BentoCardType;
  gridSpanVariant: BentoGridSpanVariant;
  visualLayout: BentoVisualLayout;
  title: string;
  description: string;
  imgStoragePath?: string;      // Canonical storage reference
  img?: string;                 // Resolved public URL
  spareImgStoragePath?: string; // Canonical storage reference
  spareImg?: string;            // Resolved public URL
  techStackLeft?: string[];
  techStackRight?: string[];
  ctaEmail?: string;
  isPublished: boolean;
  updatedAt: string;
  version: number;
}

// 3. Projects Showcase (Collection: portfolio_projects, Docs: proj_<nanoid>)
export interface ProjectDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  title: string;
  description: string;
  coverImageStoragePath: string; // Canonical storage reference
  coverImage: string;            // Resolved public URL
  iconLists: string[];
  liveUrl: string;               // Strictly HTTPS URL
  githubUrl?: string;            // Strictly https://github.com/...
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 4. Testimonials (Collection: portfolio_testimonials, Docs: test_<nanoid>)
export interface TestimonialDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatarStoragePath?: string; // Canonical storage reference
  avatarUrl?: string;         // Resolved public URL
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 5. Client Logos (Collection: portfolio_clients, Docs: client_<nanoid>)
export interface ClientDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  name: string;
  iconStoragePath: string;    // Canonical storage reference
  iconUrl: string;            // Resolved public URL
  nameImgStoragePath: string; // Canonical storage reference
  nameImgUrl: string;         // Resolved public URL
  websiteUrl?: string;        // Strictly HTTPS URL
  logoWidth?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 6. Work Experience (Collection: portfolio_experience, Docs: exp_<nanoid>)
export interface ExperienceDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  title: string;
  description: string;
  company?: string;
  period?: string;
  thumbnailStoragePath: string; // Canonical storage reference
  thumbnailUrl: string;         // Resolved public URL
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 7. Process Phases (Collection: portfolio_phases, Docs: phase_<nanoid>)
export interface PhaseDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  phaseBadge: string;
  title: string;
  description: string;
  themeColor: "emerald" | "pink" | "sky" | "violet" | "amber";
  animationSpeed: number; // Finite bounded number (0.1 to 10.0, default 1.0)
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 8. Navigation Items (Collection: portfolio_navigation, Doc: nav_main)
export interface NavItemConfig {
  id: string;
  name: string;
  link: string; // Validated against approved section anchors (#about, #projects, etc.) or internal paths
  order: number;
  isVisible: boolean;
}

export interface NavigationDocument {
  id: "nav_main";
  items: NavItemConfig[];
  updatedAt: string;
  version: number;
}

// 9. CTA Singleton (Collection: portfolio_cta, Doc: cta_main)
export interface CtaDocument {
  id: "cta_main";
  headingPrefix: string;
  headingHighlight: string;
  headingSuffix: string;
  description: string;
  buttonText: string;
  isEnabled: boolean;
  updatedAt: string;
  version: number;
}

// 10. Footer Singleton (Collection: portfolio_footer, Doc: footer_main)
export interface FooterDocument {
  id: "footer_main";
  copyrightName: string;
  termsUrl: string;   // Approved path /terms or HTTPS
  privacyUrl: string; // Approved path /privacy or HTTPS
  updatedAt: string;
  version: number;
}

// 11. Social Media Links (Collection: portfolio_social_links, Docs: soc_<nanoid>)
export interface SocialLinkDocument {
  id: string; // Server-generated opaque unique identifier
  order: number;
  platform: string;
  url: string; // Strictly HTTPS URL
  iconType: "preset" | "custom_path";
  presetName?: "github" | "twitter" | "linkedin";
  customPathD?: string; // Validated strictly as SVG path 'd' coordinate commands (no XML/HTML)
  isPublished: boolean;
  updatedAt: string;
  version: number;
}

// 12. SEO & Metadata (Collection: portfolio_seo, Doc: seo_main)
export interface SeoDocument {
  id: "seo_main";
  title: string;
  description: string;
  canonicalUrl: string; // Strictly HTTPS URL
  ogImageStoragePath?: string; // Canonical storage reference
  ogImageUrl?: string;         // Resolved public URL
  keywords: string[];
  author: string;
  twitterHandle?: string;
  updatedAt: string;
  version: number;
}

// ============================================================================
// 3. SUPPORTING INFRASTRUCTURE: STORAGE ASSET LEDGER
// ============================================================================

export type StorageAssetStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "UNATTACHED"
  | "ATTACHED"
  | "REPLACEMENT_PENDING"
  | "PENDING_DELETION"
  | "DELETED";

export interface StorageAssetLedgerDocument {
  id: string; // Server-generated opaque unique identifier
  fileName: string;
  storagePath: string; // Sole canonical storage identity
  publicUrl: string;   // Resolved CDN URL for client rendering
  mimeType: string;
  sizeBytes: number;
  status: StorageAssetStatus;
  owningEntityCollection?: string; // 1:1 ownership
  owningDocumentId?: string;       // 1:1 ownership
  owningFieldKey?: string;         // e.g. "coverImageStoragePath", "avatarStoragePath"
  uploadedByAdmin: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 4. UNIFIED PUBLIC AGGREGATE PROJECTION CONTRACT
// ============================================================================

export interface PublicPortfolioProjection {
  navigation: NavItemConfig[];
  hero: HeroDocument;
  cards: BentoCardDocument[];
  projects: ProjectDocument[];
  testimonials: TestimonialDocument[];
  clients: ClientDocument[];
  experience: ExperienceDocument[];
  phases: PhaseDocument[];
  cta: CtaDocument;
  footer: FooterDocument;
  socialLinks: SocialLinkDocument[];
  seo: SeoDocument;
}
