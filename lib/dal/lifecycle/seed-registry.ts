/**
 * Authoritative Canonical Seed Registry
 * 
 * Single Source of Truth for canonical static portfolio pillars, document schemas,
 * deterministic document identifiers, and dynamically computed document counts.
 */

import {
  SEED_HERO,
  SEED_CARDS,
  SEED_PROJECTS,
  SEED_TESTIMONIALS,
  SEED_CLIENTS,
  SEED_EXPERIENCE,
  SEED_PHASES,
  SEED_NAVIGATION,
  SEED_CTA,
  SEED_FOOTER,
  SEED_SOCIAL_LINKS,
  SEED_SEO,
  SEED_ASSISTANT,
  SEED_CLOUDFLARE,
} from "@/lib/dal/repositories/seed-data";

export interface CanonicalPillarDefinition<T = Record<string, unknown>> {
  collectionName: string;
  isSingleton: boolean;
  documents: T[];
  schemaVersion: number;
  description: string;
  ordering: number;
}

/**
 * Registry of all canonical static content pillars.
 * All document IDs are deterministic and immutable.
 */
export const CANONICAL_PILLAR_DEFINITIONS: CanonicalPillarDefinition[] = [
  {
    collectionName: "portfolio_hero",
    isSingleton: true,
    documents: [SEED_HERO as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Hero copy, title words, bio headline, and CTA triggers",
    ordering: 1,
  },
  {
    collectionName: "portfolio_cards",
    isSingleton: false,
    documents: SEED_CARDS as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "6 modular Bento Grid cards (Globe, Tech stack, Collaboration)",
    ordering: 2,
  },
  {
    collectionName: "portfolio_projects",
    isSingleton: false,
    documents: SEED_PROJECTS as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "3D Pin showcase cards, preview URLs, GitHub repositories",
    ordering: 3,
  },
  {
    collectionName: "portfolio_testimonials",
    isSingleton: false,
    documents: SEED_TESTIMONIALS as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "Client recommendations, quotes, author credentials, avatars",
    ordering: 4,
  },
  {
    collectionName: "portfolio_clients",
    isSingleton: false,
    documents: SEED_CLIENTS as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "Corporate client logos, display widths, partner links",
    ordering: 5,
  },
  {
    collectionName: "portfolio_experience",
    isSingleton: false,
    documents: SEED_EXPERIENCE as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "Career timeline cards, role descriptions, corporate periods",
    ordering: 6,
  },
  {
    collectionName: "portfolio_phases",
    isSingleton: false,
    documents: SEED_PHASES as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "3 work methodology phases, animation speeds, badges",
    ordering: 7,
  },
  {
    collectionName: "portfolio_navigation",
    isSingleton: true,
    documents: [SEED_NAVIGATION as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Floating navbar items, anchors, order sequence, visibility",
    ordering: 8,
  },
  {
    collectionName: "portfolio_cta",
    isSingleton: true,
    documents: [SEED_CTA as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Pre-footer call-to-action banner copy and interactive triggers",
    ordering: 9,
  },
  {
    collectionName: "portfolio_footer",
    isSingleton: true,
    documents: [SEED_FOOTER as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Footer copyright, legal terms link, and privacy policy route",
    ordering: 10,
  },
  {
    collectionName: "portfolio_social_links",
    isSingleton: false,
    documents: SEED_SOCIAL_LINKS as unknown as Record<string, unknown>[],
    schemaVersion: 1,
    description: "Social media platform profiles, preset icons, and links",
    ordering: 11,
  },
  {
    collectionName: "portfolio_seo",
    isSingleton: true,
    documents: [SEED_SEO as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Global OpenGraph metadata, title tags, descriptions, keywords",
    ordering: 12,
  },
  {
    collectionName: "portfolio_assistant",
    isSingleton: true,
    documents: [SEED_ASSISTANT as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "AI assistant configuration, avatar, positioning mode",
    ordering: 13,
  },
  {
    collectionName: "portfolio_cloudflare",
    isSingleton: true,
    documents: [SEED_CLOUDFLARE as unknown as Record<string, unknown>],
    schemaVersion: 1,
    description: "Turnstile keys, simulated downtime switches, fallback gateways",
    ordering: 14,
  },
];

/**
 * Dynamically derived canonical pillar count (14).
 */
export const CANONICAL_PILLAR_COUNT: number = CANONICAL_PILLAR_DEFINITIONS.length;

/**
 * Dynamically derived expected document count (37).
 */
export const EXPECTED_CANONICAL_DOCUMENT_COUNT: number = CANONICAL_PILLAR_DEFINITIONS.reduce(
  (sum, pillar) => sum + pillar.documents.length,
  0
);

/**
 * Map of collectionName to canonical pillar definition for instant lookups.
 */
export const CANONICAL_PILLAR_MAP = new Map<string, CanonicalPillarDefinition>(
  CANONICAL_PILLAR_DEFINITIONS.map((def) => [def.collectionName, def])
);

/**
 * Returns all canonical Firestore collection names.
 */
export function getCanonicalPillarCollectionNames(): string[] {
  return CANONICAL_PILLAR_DEFINITIONS.map((def) => def.collectionName);
}
