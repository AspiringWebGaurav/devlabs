/**
 * Master Lifecycle Data Classification Policy
 * 
 * Single Source of Truth for classifying every database entity, collection,
 * and persistence namespace across Firestore, RTDB, and Upstash Redis.
 * 
 * Classifications:
 * - PROTECTED_CONTENT: Immutable portfolio content pillars. Must survive purge with 0 byte drift (SHA-256 verified).
 * - SYSTEM_SIGNAL: Realtime CMS synchronization channels. Updated post-purge/reseed to notify clients.
 * - DYNAMIC: Disposable application, operational, inquiry, chat, and telemetry records. Targeted for destruction.
 * - UNKNOWN: Unclassified entities. Triggers immediate fail-closed abort with 0 destructive operations.
 */

export type EntityClassification = "PROTECTED_CONTENT" | "SYSTEM_SIGNAL" | "DYNAMIC" | "UNKNOWN";

export interface PolicyEntityDefinition {
  name: string;
  store: "firestore" | "rtdb" | "redis";
  classification: EntityClassification;
  description: string;
  publicFeatureDependency?: string;
  isSingleton?: boolean;
}

/**
 * Authoritative Policy Registry of all recognized persistence entities.
 */
export const LIFECYCLE_POLICY: Record<string, PolicyEntityDefinition> = {
  // =========================================================================
  // 1. PROTECTED CONTENT (Immutable Static Portfolio Pillars)
  // =========================================================================
  portfolio_hero: {
    name: "portfolio_hero",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Hero copy, title words, bio headline, CTA link",
    publicFeatureDependency: "HeroSection.tsx",
    isSingleton: true,
  },
  portfolio_cards: {
    name: "portfolio_cards",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "6 modular Bento Grid slots (Globe, Tech stack, Collaboration)",
    publicFeatureDependency: "GridSection.tsx",
  },
  portfolio_projects: {
    name: "portfolio_projects",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "3D Pin showcase cards, live preview URLs, GitHub repositories",
    publicFeatureDependency: "ProjectsSection.tsx",
  },
  portfolio_testimonials: {
    name: "portfolio_testimonials",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Client recommendations, quotes, author credentials, avatars",
    publicFeatureDependency: "TestimonialsSection.tsx",
  },
  portfolio_clients: {
    name: "portfolio_clients",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Corporate client logos, display widths, partner links",
    publicFeatureDependency: "TestimonialsSection.tsx",
  },
  portfolio_experience: {
    name: "portfolio_experience",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Career timeline cards, role descriptions, corporate periods",
    publicFeatureDependency: "ExperienceSection.tsx",
  },
  portfolio_phases: {
    name: "portfolio_phases",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "3 work methodology phases, canvas animation speeds, theme badges",
    publicFeatureDependency: "ApproachSection.tsx",
  },
  portfolio_navigation: {
    name: "portfolio_navigation",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Floating navbar items, anchors, order sequence, visibility flags",
    publicFeatureDependency: "FloatingNav.tsx",
    isSingleton: true,
  },
  portfolio_cta: {
    name: "portfolio_cta",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Pre-footer call-to-action banner copy and interactive triggers",
    publicFeatureDependency: "FooterSection.tsx",
    isSingleton: true,
  },
  portfolio_footer: {
    name: "portfolio_footer",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Footer copyright, legal terms link, and privacy policy route",
    publicFeatureDependency: "FooterSection.tsx",
    isSingleton: true,
  },
  portfolio_social_links: {
    name: "portfolio_social_links",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Social media platform profiles, preset icons, and links",
    publicFeatureDependency: "FooterSection.tsx",
  },
  portfolio_seo: {
    name: "portfolio_seo",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Global OpenGraph metadata, title tags, descriptions, keywords",
    publicFeatureDependency: "app/layout.tsx",
    isSingleton: true,
  },
  portfolio_assistant: {
    name: "portfolio_assistant",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "AI assistant configuration, avatar, positioning mode, toggle state",
    publicFeatureDependency: "AssistantBubble.tsx",
    isSingleton: true,
  },
  portfolio_cloudflare: {
    name: "portfolio_cloudflare",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Turnstile keys, simulated downtime switches, fallback gateways",
    publicFeatureDependency: "Security Layer",
    isSingleton: true,
  },
  portfolio_services: {
    name: "portfolio_services",
    store: "firestore",
    classification: "PROTECTED_CONTENT",
    description: "Microservice health endpoints and latency telemetry baseline",
    publicFeatureDependency: "Admin Command Hub",
  },

  // =========================================================================
  // 2. SYSTEM SIGNALS (Legitimate Realtime Invalidation Channels)
  // =========================================================================
  portfolio_signal: {
    name: "portfolio_signal",
    store: "firestore",
    classification: "SYSTEM_SIGNAL",
    description: "Realtime CMS sync Firestore fallback signal document",
    publicFeatureDependency: "LivePortfolioSync.tsx",
    isSingleton: true,
  },
  "public_signals/cms_sync": {
    name: "public_signals/cms_sync",
    store: "rtdb",
    classification: "SYSTEM_SIGNAL",
    description: "Realtime WebSocket fleet invalidation change broadcaster",
    publicFeatureDependency: "LivePortfolioSync.tsx",
  },

  // =========================================================================
  // 3. DYNAMIC ENTITIES (Destructive Targets)
  // =========================================================================
  inquiries: {
    name: "inquiries",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Contact form leads, client messages, delivery state records",
  },
  admin_mails: {
    name: "admin_mails",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Sent email history, provider receipts, message hashes",
  },
  admin_mail_drafts: {
    name: "admin_mail_drafts",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Drafted admin emails and composer state",
  },
  media: {
    name: "media",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Media asset tracking ledger for dynamic uploads",
  },
  storage_assets: {
    name: "storage_assets",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Storage asset ownership records and upload ledger",
  },
  live_chat_sessions: {
    name: "live_chat_sessions",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Authenticated visitor chat sessions",
  },
  live_chat_challenges: {
    name: "live_chat_challenges",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Visitor live chat OTP verification challenge records",
  },
  portfolio_live_chat_threads: {
    name: "portfolio_live_chat_threads",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Live chat multi-turn conversation threads",
  },
  portfolio_live_chat_messages: {
    name: "portfolio_live_chat_messages",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Live chat individual message documents and history",
  },
  live_chat_threads: {
    name: "live_chat_threads",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Legacy live chat thread records",
  },
  live_chat_notification_jobs: {
    name: "live_chat_notification_jobs",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Background alert jobs for unread visitor messages",
  },
  live_chat_room_sessions: {
    name: "live_chat_room_sessions",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Room-based live chat session tokens",
  },
  live_chat_room_access: {
    name: "live_chat_room_access",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Visitor live chat room authorization receipts",
  },
  live_chat_return_capabilities: {
    name: "live_chat_return_capabilities",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Visitor return authentication capabilities",
  },
  live_chat_visitor_notification_jobs: {
    name: "live_chat_visitor_notification_jobs",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Visitor notification dispatch jobs",
  },
  admin_auth_challenges: {
    name: "admin_auth_challenges",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Superadmin Google/OTP authentication challenge records",
  },
  admin_challenges: {
    name: "admin_challenges",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Legacy admin challenge records",
  },
  admin_trusted_ips: {
    name: "admin_trusted_ips",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Superadmin trusted device IP cache",
  },
  admin_ip_verifications: {
    name: "admin_ip_verifications",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Superadmin IP approval challenge tokens",
  },
  counters: {
    name: "counters",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Monotonic sequential lead counter documents",
  },
  rate_limits: {
    name: "rate_limits",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Fallback rate limiting documents",
  },
  purge_test_dynamic: {
    name: "purge_test_dynamic",
    store: "firestore",
    classification: "DYNAMIC",
    description: "Automated negative test dynamic collection",
  },
  "stats/leadCount": {
    name: "stats/leadCount",
    store: "rtdb",
    classification: "DYNAMIC",
    description: "Monotonic sequential lead number counter node in RTDB",
  },
  "rate_limits/": {
    name: "rate_limits/",
    store: "rtdb",
    classification: "DYNAMIC",
    description: "Fallback rate-limiting keys in Realtime Database",
  },
};

/**
 * Classifies a discovered entity name against the authoritative policy.
 * Returns UNKNOWN if the entity is not explicitly registered.
 */
export function classifyEntity(entityName: string): EntityClassification {
  const def = LIFECYCLE_POLICY[entityName];
  if (!def) return "UNKNOWN";
  return def.classification;
}

/**
 * Returns all recognized Firestore collection names classified as PROTECTED_CONTENT.
 */
export function getProtectedContentCollectionNames(): string[] {
  return Object.values(LIFECYCLE_POLICY)
    .filter((def) => def.store === "firestore" && def.classification === "PROTECTED_CONTENT")
    .map((def) => def.name);
}

/**
 * Returns all recognized Firestore collection names classified as DYNAMIC.
 */
export function getKnownDynamicCollectionNames(): string[] {
  return Object.values(LIFECYCLE_POLICY)
    .filter((def) => def.store === "firestore" && def.classification === "DYNAMIC")
    .map((def) => def.name);
}

/**
 * Asserts that all discovered collections in a list are known and classified.
 * Throws a detailed fail-closed error if any UNKNOWN collection is present.
 */
export function assertFailClosedClassification(discoveredCollections: string[]): {
  protectedList: string[];
  dynamicList: string[];
  signalList: string[];
} {
  const protectedList: string[] = [];
  const dynamicList: string[] = [];
  const signalList: string[] = [];
  const unknownList: string[] = [];

  for (const name of discoveredCollections) {
    const classification = classifyEntity(name);
    if (classification === "PROTECTED_CONTENT") {
      protectedList.push(name);
    } else if (classification === "DYNAMIC") {
      dynamicList.push(name);
    } else if (classification === "SYSTEM_SIGNAL") {
      signalList.push(name);
    } else {
      unknownList.push(name);
    }
  }

  if (unknownList.length > 0) {
    throw new Error(
      `FAIL-CLOSED ABORT: Discovered ${unknownList.length} UNCLASSIFIED collection(s) in Firestore: [${unknownList.join(
        ", "
      )}]. For safety, destructive operations are prohibited until all collections are registered in lib/dal/lifecycle/policy.ts.`
    );
  }

  return { protectedList, dynamicList, signalList };
}
