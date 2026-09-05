/**
 * Centralized Legal Center routing constants, link helpers, and anchor maps.
 * Ensures consistent URL hash synchronization across public portfolio and admin views.
 */

export const LEGAL_ROUTES = {
  // Public routes
  terms: "/terms",
  privacy: "/privacy",

  // Admin Legal Center routes
  adminLegal: "/admin/legal",
  adminLegalEditor: "/admin/legal/editor",
  adminLegalHistory: "/admin/legal/history",

  // Operator Governance routes (isolated)
  adminTerms: "/admin/terms",
  adminPrivacy: "/admin/privacy",
} as const;

export const TERMS_ANCHORS = {
  acceptance: "acceptance",
  anonymity: "anonymity",
  ip: "ip",
  abuseMitigation: "abuse-mitigation",
  emailStandards: "email-standards",
  assistantTerms: "assistant-terms",
  whatsappTerms: "whatsapp-terms",
  adminGovernance: "admin-governance",
  legalContact: "legal-contact",
} as const;

export const PRIVACY_ANCHORS = {
  overview: "overview",
  anonymity: "anonymity",
  turnstile: "turnstile",
  brevo: "brevo",
  dataRights: "data-rights",
  assistantPrivacy: "assistant-privacy",
  whatsappDataExport: "whatsapp-data-export",
  adminPrivacy: "admin-privacy",
  contactRequests: "contact-requests",
} as const;

export type TermsAnchorKey = keyof typeof TERMS_ANCHORS;
export type PrivacyAnchorKey = keyof typeof PRIVACY_ANCHORS;

/**
 * Builds a canonical public URL with hash anchor and optional focus parameter.
 */
export function getLegalSectionHref(
  docType: "TERMS" | "PRIVACY",
  anchorId: string,
  focusParam?: string
): string {
  const base = docType === "TERMS" ? LEGAL_ROUTES.terms : LEGAL_ROUTES.privacy;
  const params = focusParam ? `?focus=${encodeURIComponent(focusParam)}` : "";
  return `${base}${params}#${anchorId}`;
}
