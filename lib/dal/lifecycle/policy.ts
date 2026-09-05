/**
 * Master Lifecycle Data Classification Policy (10/10 Enterprise Hardened)
 * 
 * Single Source of Truth for classifying every database entity, collection,
 * and persistence namespace across Firestore, RTDB, and Upstash Redis.
 * 
 * Classifications:
 * - PROTECTED_ADMIN_AUTH: Superadmin security, OTP challenges, and trusted IP cache. IMMUNE to all mutations.
 * - STATIC_CANONICAL: Authoritative 14 portfolio CMS content pillars. Seedable and reconcilable.
 * - DYNAMIC_APPLICATION: Disposable operational, lead, inquiry, chat, and telemetry records.
 * - DERIVED_CACHE: Upstash Redis keys and RTDB counters. Flushed/regenerated.
 * - OPERATIONAL_METADATA: Realtime CMS synchronization channels and persistent lifecycle execution history.
 * - UNKNOWN: Unclassified entities. STRICT FAIL-CLOSED abort.
 */

export type LifecycleClassification =
  | "PROTECTED_ADMIN_AUTH"
  | "STATIC_CANONICAL"
  | "DYNAMIC_APPLICATION"
  | "DERIVED_CACHE"
  | "OPERATIONAL_METADATA"
  | "UNKNOWN";

export interface PolicyEntityDefinition {
  name: string;
  store: "firestore" | "rtdb" | "redis";
  classification: LifecycleClassification;
  description: string;
  publicFeatureDependency?: string;
  isSingleton?: boolean;
  canDelete: boolean;
  canSeed: boolean;
  isProtected: boolean;
}

/**
 * Authoritative Policy Registry of all recognized persistence entities.
 */
export const LIFECYCLE_POLICY: Record<string, PolicyEntityDefinition> = {
  // =========================================================================
  // 1. PROTECTED ADMIN AUTH (Immune to All Lifecycle Deletions / Mutations)
  // =========================================================================
  admin_trusted_ips: {
    name: "admin_trusted_ips",
    store: "firestore",
    classification: "PROTECTED_ADMIN_AUTH",
    description: "Superadmin trusted device IP cache (SHA-256 identifiers)",
    publicFeatureDependency: "Admin Security Gate",
    canDelete: false,
    canSeed: false,
    isProtected: true,
  },
  admin_auth_challenges: {
    name: "admin_auth_challenges",
    store: "firestore",
    classification: "PROTECTED_ADMIN_AUTH",
    description: "Superadmin Google/OTP authentication challenge state",
    publicFeatureDependency: "Admin Login Flow",
    canDelete: false,
    canSeed: false,
    isProtected: true,
  },
  admin_ip_verifications: {
    name: "admin_ip_verifications",
    store: "firestore",
    classification: "PROTECTED_ADMIN_AUTH",
    description: "Superadmin IP approval challenge tokens",
    publicFeatureDependency: "Admin Security Gate",
    canDelete: false,
    canSeed: false,
    isProtected: true,
  },
  admin_challenges: {
    name: "admin_challenges",
    store: "firestore",
    classification: "PROTECTED_ADMIN_AUTH",
    description: "Legacy admin challenge records",
    publicFeatureDependency: "Admin Security Gate",
    canDelete: false,
    canSeed: false,
    isProtected: true,
  },

  // =========================================================================
  // 2. STATIC CANONICAL (14 Authoritative Portfolio Content Pillars)
  // =========================================================================
  portfolio_hero: {
    name: "portfolio_hero",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Hero copy, title words, bio headline, CTA link",
    publicFeatureDependency: "HeroSection.tsx",
    isSingleton: true,
    canDelete: true, // only during explicit RESET
    canSeed: true,
    isProtected: false,
  },
  portfolio_cards: {
    name: "portfolio_cards",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "6 modular Bento Grid slots (Globe, Tech stack, Collaboration)",
    publicFeatureDependency: "GridSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_projects: {
    name: "portfolio_projects",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "3D Pin showcase cards, live preview URLs, GitHub repositories",
    publicFeatureDependency: "ProjectsSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_testimonials: {
    name: "portfolio_testimonials",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Client recommendations, quotes, author credentials, avatars",
    publicFeatureDependency: "TestimonialsSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_clients: {
    name: "portfolio_clients",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Corporate client logos, display widths, partner links",
    publicFeatureDependency: "TestimonialsSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_experience: {
    name: "portfolio_experience",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Career timeline cards, role descriptions, corporate periods",
    publicFeatureDependency: "ExperienceSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_phases: {
    name: "portfolio_phases",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "3 work methodology phases, animation speeds, theme badges",
    publicFeatureDependency: "ApproachSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_navigation: {
    name: "portfolio_navigation",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Floating navbar items, anchors, order sequence, visibility",
    publicFeatureDependency: "FloatingNav.tsx",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_cta: {
    name: "portfolio_cta",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Pre-footer call-to-action banner copy and interactive triggers",
    publicFeatureDependency: "FooterSection.tsx",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_footer: {
    name: "portfolio_footer",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Footer copyright, legal terms link, and privacy policy route",
    publicFeatureDependency: "FooterSection.tsx",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_social_links: {
    name: "portfolio_social_links",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Social media platform profiles, preset icons, and links",
    publicFeatureDependency: "FooterSection.tsx",
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_seo: {
    name: "portfolio_seo",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Global OpenGraph metadata, title tags, descriptions, keywords",
    publicFeatureDependency: "app/layout.tsx",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_assistant: {
    name: "portfolio_assistant",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "AI assistant configuration, avatar, positioning mode",
    publicFeatureDependency: "AssistantBubble.tsx",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },
  portfolio_cloudflare: {
    name: "portfolio_cloudflare",
    store: "firestore",
    classification: "STATIC_CANONICAL",
    description: "Turnstile keys, simulated downtime switches, fallback gateways",
    publicFeatureDependency: "Security Layer",
    isSingleton: true,
    canDelete: true,
    canSeed: true,
    isProtected: false,
  },

  // =========================================================================
  // 3. OPERATIONAL METADATA & SYSTEM SIGNALS (Never Deleted by Clean/Reset)
  // =========================================================================
  portfolio_services: {
    name: "portfolio_services",
    store: "firestore",
    classification: "OPERATIONAL_METADATA",
    description: "Internal microservice health endpoints and latency baseline",
    publicFeatureDependency: "Admin Command Hub",
    canDelete: false,
    canSeed: false,
    isProtected: false,
  },
  portfolio_signal: {
    name: "portfolio_signal",
    store: "firestore",
    classification: "OPERATIONAL_METADATA",
    description: "Realtime CMS sync Firestore fallback signal document",
    publicFeatureDependency: "LivePortfolioSync.tsx",
    isSingleton: true,
    canDelete: false,
    canSeed: false,
    isProtected: false,
  },
  "public_signals/cms_sync": {
    name: "public_signals/cms_sync",
    store: "rtdb",
    classification: "OPERATIONAL_METADATA",
    description: "Realtime WebSocket fleet invalidation change broadcaster",
    publicFeatureDependency: "LivePortfolioSync.tsx",
    canDelete: false,
    canSeed: false,
    isProtected: false,
  },
  lifecycle_executions: {
    name: "lifecycle_executions",
    store: "firestore",
    classification: "OPERATIONAL_METADATA",
    description: "Permanent immutable lifecycle execution history and receipts",
    publicFeatureDependency: "Database Lifecycle Control Center",
    canDelete: false,
    canSeed: false,
    isProtected: false,
  },
  portfolio_legal_docs: {
    name: "portfolio_legal_docs",
    store: "firestore",
    classification: "OPERATIONAL_METADATA",
    description: "Authoritative public Terms of Service and Privacy Policy singletons and active drafts (Preserved across purges)",
    publicFeatureDependency: "app/terms/page.tsx, app/privacy/page.tsx",
    isSingleton: false,
    canDelete: false, // PRESERVED: Never deleted during Clean or Reset
    canSeed: false,
    isProtected: true,
  },
  portfolio_legal_history: {
    name: "portfolio_legal_history",
    store: "firestore",
    classification: "OPERATIONAL_METADATA",
    description: "Immutable historical legal document versions, snapshots, and audit records",
    publicFeatureDependency: "app/admin/legal/history",
    canDelete: false,
    canSeed: false,
    isProtected: false,
  },

  // =========================================================================
  // 4. DYNAMIC APPLICATION ENTITIES (Disposable Targets for Clean & Reset)
  // =========================================================================
  inquiries: {
    name: "inquiries",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Contact form leads, client messages, delivery state records",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  admin_mails: {
    name: "admin_mails",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Sent email history, provider receipts, message hashes",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  admin_mail_drafts: {
    name: "admin_mail_drafts",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Drafted admin emails and composer state",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  media: {
    name: "media",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Legacy media asset tracking ledger for dynamic uploads",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  storage_assets: {
    name: "storage_assets",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Storage asset ownership records and upload ledger",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_sessions: {
    name: "live_chat_sessions",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Authenticated visitor chat sessions",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_challenges: {
    name: "live_chat_challenges",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Visitor live chat OTP verification challenge records",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  portfolio_live_chat_threads: {
    name: "portfolio_live_chat_threads",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Live chat multi-turn conversation threads",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  portfolio_live_chat_messages: {
    name: "portfolio_live_chat_messages",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Live chat individual message documents and history",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_threads: {
    name: "live_chat_threads",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Legacy live chat thread records",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_notification_jobs: {
    name: "live_chat_notification_jobs",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Background alert jobs for unread visitor messages",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_room_sessions: {
    name: "live_chat_room_sessions",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Room-based live chat session tokens",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_room_access: {
    name: "live_chat_room_access",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Visitor live chat room authorization receipts",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_return_capabilities: {
    name: "live_chat_return_capabilities",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Visitor return authentication capabilities",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  live_chat_visitor_notification_jobs: {
    name: "live_chat_visitor_notification_jobs",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Visitor notification dispatch jobs",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  counters: {
    name: "counters",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Monotonic sequential lead counter documents",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  rate_limits: {
    name: "rate_limits",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Fallback rate limiting documents",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  purge_test_dynamic: {
    name: "purge_test_dynamic",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Automated negative test dynamic collection",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  legal_notification_jobs: {
    name: "legal_notification_jobs",
    store: "firestore",
    classification: "DYNAMIC_APPLICATION",
    description: "Asynchronous background legal update notification dispatch jobs, recipient ledgers, and subcollections",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },

  // =========================================================================
  // 5. DERIVED CACHE & TRANSIENT NODES (Cleared on Clean & Reset)
  // =========================================================================
  "stats/leadCount": {
    name: "stats/leadCount",
    store: "rtdb",
    classification: "DERIVED_CACHE",
    description: "Monotonic sequential lead number counter node in RTDB",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
  "rate_limits/": {
    name: "rate_limits/",
    store: "rtdb",
    classification: "DERIVED_CACHE",
    description: "Fallback rate-limiting keys in Realtime Database",
    canDelete: true,
    canSeed: false,
    isProtected: false,
  },
};

/**
 * Authoritative Redis Namespace Registry.
 */
export const REDIS_NAMESPACE_POLICY = {
  "counter:*": {
    pattern: "counter:*",
    classification: "DERIVED_CACHE" as LifecycleClassification,
    description: "Atomic sequential lead number counter",
    isDisposable: true,
  },
  "ratelimit:*": {
    pattern: "ratelimit:*",
    classification: "DERIVED_CACHE" as LifecycleClassification,
    description: "Contact and Live Chat API rate limits",
    isDisposable: true,
  },
  "cache:*": {
    pattern: "cache:*",
    classification: "DERIVED_CACHE" as LifecycleClassification,
    description: "General ephemeral application caches",
    isDisposable: true,
  },
  "system:lifecycle:*": {
    pattern: "system:lifecycle:*",
    classification: "OPERATIONAL_METADATA" as LifecycleClassification,
    description: "Distributed lifecycle locking and heartbeat tokens",
    isDisposable: false, // NEVER deleted during cache cleanup
  },
};

/**
 * Classifies an entity name against the authoritative policy.
 * Returns UNKNOWN if the entity is not explicitly registered.
 */
export function classifyEntity(entityName: string): LifecycleClassification {
  const def = LIFECYCLE_POLICY[entityName];
  if (!def) return "UNKNOWN";
  return def.classification;
}

/**
 * Returns all Firestore collection names classified as STATIC_CANONICAL.
 */
export function getStaticCanonicalCollectionNames(): string[] {
  return Object.values(LIFECYCLE_POLICY)
    .filter((def) => def.store === "firestore" && def.classification === "STATIC_CANONICAL")
    .map((def) => def.name);
}

/**
 * Returns all Firestore collection names classified as PROTECTED_ADMIN_AUTH.
 */
export function getProtectedAdminAuthCollectionNames(): string[] {
  return Object.values(LIFECYCLE_POLICY)
    .filter((def) => def.store === "firestore" && def.classification === "PROTECTED_ADMIN_AUTH")
    .map((def) => def.name);
}

/**
 * Returns all Firestore collection names classified as DYNAMIC_APPLICATION.
 */
export function getKnownDynamicCollectionNames(): string[] {
  return Object.values(LIFECYCLE_POLICY)
    .filter((def) => def.store === "firestore" && def.classification === "DYNAMIC_APPLICATION")
    .map((def) => def.name);
}

/**
 * Asserts that all discovered collections in a list are known and classified.
 * Throws a detailed fail-closed error if any UNKNOWN collection is present.
 */
export function assertFailClosedClassification(discoveredCollections: string[]): {
  protectedAuthList: string[];
  staticCanonicalList: string[];
  dynamicList: string[];
  metadataList: string[];
} {
  const protectedAuthList: string[] = [];
  const staticCanonicalList: string[] = [];
  const dynamicList: string[] = [];
  const metadataList: string[] = [];
  const unknownList: string[] = [];

  for (const name of discoveredCollections) {
    const classification = classifyEntity(name);
    if (classification === "PROTECTED_ADMIN_AUTH") {
      protectedAuthList.push(name);
    } else if (classification === "STATIC_CANONICAL") {
      staticCanonicalList.push(name);
    } else if (classification === "DYNAMIC_APPLICATION") {
      dynamicList.push(name);
    } else if (classification === "OPERATIONAL_METADATA") {
      metadataList.push(name);
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

  return { protectedAuthList, staticCanonicalList, dynamicList, metadataList };
}
