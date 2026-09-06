/**
 * Central Email Identity & Sender Configuration
 * Primary Domain: gauravpatil.site (Verified Brevo Gateway)
 * Pre-Production Link: devlabs.eu.cc
 * Production Link: gauravpatil.site
 *
 * Single Source of Truth for all portfolio email senders, purposes, and reply-to routing.
 */

export const PRIMARY_EMAIL_DOMAIN = "gauravpatil.site";
export const LEGACY_EMAIL_DOMAIN = "gauravpatil.site";
export const PRE_PRODUCTION_DOMAIN = "devlabs.eu.cc";
export const PRODUCTION_DOMAIN = "gauravpatil.site";

/**
 * Backwards compatibility alias for the active authenticated email domain.
 */
export const AUTHENTICATED_EMAIL_DOMAIN = PRIMARY_EMAIL_DOMAIN;

export type EmailIdentityType =
  | "HELLO"
  | "SECURITY"
  | "HELP"
  | "NO_REPLY"
  | "ME"
  | "WORK";

export interface EmailSenderVariant {
  email: string;
  name: string;
  defaultReplyTo: string;
  purpose: string;
  isNoReply: boolean;
}

export interface EmailIdentity {
  type: EmailIdentityType;
  key: EmailIdentityType;
  email: string;
  primaryEmail: string;
  legacyEmail: string;
  name: string;
  displayName: string;
  defaultReplyTo: string;
  purpose: string;
  isNoReply: boolean;
  primary: EmailSenderVariant;
  legacy: EmailSenderVariant;
}

export const EMAIL_IDENTITIES: Record<EmailIdentityType, EmailIdentity> = {
  HELLO: {
    type: "HELLO",
    key: "HELLO",
    email: "hello@gauravpatil.site",
    primaryEmail: "hello@gauravpatil.site",
    legacyEmail: "hello@gauravpatil.site",
    name: "Gaurav Patil",
    displayName: "Gaurav Patil",
    defaultReplyTo: "hello@gauravpatil.site",
    purpose:
      "Public-facing communication, contact form inquiries, auto replies, and general visitor correspondence.",
    isNoReply: false,
    primary: {
      email: "hello@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "hello@gauravpatil.site",
      purpose: "Direct contact and automated receipts.",
      isNoReply: false,
    },
    legacy: {
      email: "hello@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "hello@gauravpatil.site",
      purpose: "Direct contact and automated receipts.",
      isNoReply: false,
    },
  },
  ME: {
    type: "ME",
    key: "ME",
    email: "me@gauravpatil.site",
    primaryEmail: "me@gauravpatil.site",
    legacyEmail: "me@gauravpatil.site",
    name: "Gaurav Patil",
    displayName: "Gaurav Patil",
    defaultReplyTo: "me@gauravpatil.site",
    purpose:
      "Direct executive correspondence, personal developer outreach, and VIP contacts.",
    isNoReply: false,
    primary: {
      email: "me@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "me@gauravpatil.site",
      purpose: "Executive direct line.",
      isNoReply: false,
    },
    legacy: {
      email: "me@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "me@gauravpatil.site",
      purpose: "Executive direct line.",
      isNoReply: false,
    },
  },
  WORK: {
    type: "WORK",
    key: "WORK",
    email: "work@gauravpatil.site",
    primaryEmail: "work@gauravpatil.site",
    legacyEmail: "work@gauravpatil.site",
    name: "Gaurav Patil",
    displayName: "Gaurav Patil",
    defaultReplyTo: "work@gauravpatil.site",
    purpose:
      "Client proposals, consulting engagements, freelance contracts, and business inquiries.",
    isNoReply: false,
    primary: {
      email: "work@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "work@gauravpatil.site",
      purpose: "Professional and consulting engagements.",
      isNoReply: false,
    },
    legacy: {
      email: "work@gauravpatil.site",
      name: "Gaurav Patil",
      defaultReplyTo: "work@gauravpatil.site",
      purpose: "Professional and consulting engagements.",
      isNoReply: false,
    },
  },
  SECURITY: {
    type: "SECURITY",
    key: "SECURITY",
    email: "security@gauravpatil.site",
    primaryEmail: "security@gauravpatil.site",
    legacyEmail: "security@gauravpatil.site",
    name: "Gaurav Security Services",
    displayName: "Gaurav Security Services",
    defaultReplyTo: "security@gauravpatil.site",
    purpose:
      "OTP emails, email verification, 2FA, login/security verification, password reset, security recovery & alerts.",
    isNoReply: false,
    primary: {
      email: "security@gauravpatil.site",
      name: "Gaurav Security Services",
      defaultReplyTo: "security@gauravpatil.site",
      purpose: "Security alerts and inquiry replies.",
      isNoReply: false,
    },
    legacy: {
      email: "security@gauravpatil.site",
      name: "Gaurav Security Services",
      defaultReplyTo: "security@gauravpatil.site",
      purpose: "Security alerts and inquiry replies.",
      isNoReply: false,
    },
  },
  HELP: {
    type: "HELP",
    key: "HELP",
    email: "help@gauravpatil.site",
    primaryEmail: "help@gauravpatil.site",
    legacyEmail: "help@gauravpatil.site",
    name: "Gaurav Support",
    displayName: "Gaurav Support",
    defaultReplyTo: "help@gauravpatil.site",
    purpose:
      "Support requests, assistance, ticket notifications, and user help workflows.",
    isNoReply: false,
    primary: {
      email: "help@gauravpatil.site",
      name: "Gaurav Support",
      defaultReplyTo: "help@gauravpatil.site",
      purpose: "Support and assistance.",
      isNoReply: false,
    },
    legacy: {
      email: "help@gauravpatil.site",
      name: "Gaurav Support",
      defaultReplyTo: "help@gauravpatil.site",
      purpose: "Support and assistance.",
      isNoReply: false,
    },
  },
  NO_REPLY: {
    type: "NO_REPLY",
    key: "NO_REPLY",
    email: "no-reply@gauravpatil.site",
    primaryEmail: "no-reply@gauravpatil.site",
    legacyEmail: "no-reply@gauravpatil.site",
    name: "Gaurav Portfolio No-Reply",
    displayName: "Gaurav Portfolio No-Reply",
    defaultReplyTo: "no-reply@gauravpatil.site",
    purpose:
      "Strictly non-reply automated system notifications and ephemeral passcodes where replying is not applicable.",
    isNoReply: true,
    primary: {
      email: "no-reply@gauravpatil.site",
      name: "Gaurav Portfolio No-Reply",
      defaultReplyTo: "no-reply@gauravpatil.site",
      purpose: "OTP and system notifications.",
      isNoReply: true,
    },
    legacy: {
      email: "no-reply@gauravpatil.site",
      name: "Gaurav Portfolio No-Reply",
      defaultReplyTo: "no-reply@gauravpatil.site",
      purpose: "OTP and system notifications.",
      isNoReply: true,
    },
  },
} as const;

export type EmailPurpose =
  | "CONTACT_FORM"
  | "CONTACT_FORM_AUTO_REPLY"
  | "SECURITY_OTP"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET"
  | "SECURITY_ALERT"
  | "SUPPORT_REQUEST"
  | "SUPPORT_NOTIFICATION"
  | "SYSTEM_NOTIFICATION";

/**
 * Resolves the appropriate EmailIdentity based on the specific transactional purpose.
 */
export function getEmailIdentityForPurpose(purpose: EmailPurpose): EmailIdentity {
  switch (purpose) {
    case "CONTACT_FORM":
    case "CONTACT_FORM_AUTO_REPLY":
      return EMAIL_IDENTITIES.HELLO;
    case "SECURITY_OTP":
      return EMAIL_IDENTITIES.NO_REPLY;
    case "EMAIL_VERIFICATION":
    case "PASSWORD_RESET":
    case "SECURITY_ALERT":
      return EMAIL_IDENTITIES.SECURITY;
    case "SUPPORT_REQUEST":
    case "SUPPORT_NOTIFICATION":
      return EMAIL_IDENTITIES.HELP;
    case "SYSTEM_NOTIFICATION":
      return EMAIL_IDENTITIES.NO_REPLY;
    default:
      return EMAIL_IDENTITIES.HELLO;
  }
}
