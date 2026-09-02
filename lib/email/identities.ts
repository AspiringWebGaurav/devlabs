/**
 * Central Email Identity & Sender Configuration
 * Primary Domain: gauravpatil.online
 * Legacy Domain: gauravservices.eu.cc
 *
 * Single Source of Truth for all portfolio email senders, purposes, and reply-to routing.
 */

export const PRIMARY_EMAIL_DOMAIN = "gauravpatil.online";
export const LEGACY_EMAIL_DOMAIN = "gauravservices.eu.cc";

/**
 * Backwards compatibility alias for the active authenticated email domain.
 */
export const AUTHENTICATED_EMAIL_DOMAIN = PRIMARY_EMAIL_DOMAIN;

export type EmailIdentityType = "HELLO" | "SECURITY" | "HELP" | "NO_REPLY";

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
    email: "hello@gauravpatil.online",
    primaryEmail: "hello@gauravpatil.online",
    legacyEmail: "hello@gauravservices.eu.cc",
    name: "Gaurav Patil",
    displayName: "Gaurav Patil",
    defaultReplyTo: "hello@gauravpatil.online",
    purpose:
      "Public-facing communication, contact form inquiries, auto replies, and general visitor correspondence.",
    isNoReply: false,
    primary: {
      email: "hello@gauravpatil.online",
      name: "Gaurav Patil",
      defaultReplyTo: "hello@gauravpatil.online",
      purpose: "Direct contact and automated receipts.",
      isNoReply: false,
    },
    legacy: {
      email: "hello@gauravservices.eu.cc",
      name: "Gaurav Services",
      defaultReplyTo: "hello@gauravservices.eu.cc",
      purpose: "Legacy direct contact and automated receipts.",
      isNoReply: false,
    },
  },
  SECURITY: {
    type: "SECURITY",
    key: "SECURITY",
    email: "security@gauravpatil.online",
    primaryEmail: "security@gauravpatil.online",
    legacyEmail: "security@gauravservices.eu.cc",
    name: "Gaurav Security Services",
    displayName: "Gaurav Security Services",
    defaultReplyTo: "security@gauravpatil.online",
    purpose:
      "OTP emails, email verification, 2FA, login/security verification, password reset, security recovery & alerts.",
    isNoReply: false,
    primary: {
      email: "security@gauravpatil.online",
      name: "Gaurav Security Services",
      defaultReplyTo: "security@gauravpatil.online",
      purpose: "Security alerts and inquiry replies.",
      isNoReply: false,
    },
    legacy: {
      email: "security@gauravservices.eu.cc",
      name: "Gaurav Security Services",
      defaultReplyTo: "security@gauravservices.eu.cc",
      purpose: "Legacy security alerts and inquiry replies.",
      isNoReply: false,
    },
  },
  HELP: {
    type: "HELP",
    key: "HELP",
    email: "help@gauravpatil.online",
    primaryEmail: "help@gauravpatil.online",
    legacyEmail: "help@gauravservices.eu.cc",
    name: "Gaurav Support",
    displayName: "Gaurav Support",
    defaultReplyTo: "help@gauravpatil.online",
    purpose:
      "Support requests, assistance, ticket notifications, and user help workflows.",
    isNoReply: false,
    primary: {
      email: "help@gauravpatil.online",
      name: "Gaurav Support",
      defaultReplyTo: "help@gauravpatil.online",
      purpose: "Support and assistance.",
      isNoReply: false,
    },
    legacy: {
      email: "help@gauravservices.eu.cc",
      name: "Gaurav Support",
      defaultReplyTo: "help@gauravservices.eu.cc",
      purpose: "Legacy support and assistance.",
      isNoReply: false,
    },
  },
  NO_REPLY: {
    type: "NO_REPLY",
    key: "NO_REPLY",
    email: "no-reply@gauravpatil.online",
    primaryEmail: "no-reply@gauravpatil.online",
    legacyEmail: "no-reply@gauravservices.eu.cc",
    name: "Gaurav Services",
    displayName: "Gaurav Services",
    defaultReplyTo: "no-reply@gauravpatil.online",
    purpose:
      "Strictly non-reply automated system notifications and ephemeral passcodes where replying is not applicable.",
    isNoReply: true,
    primary: {
      email: "no-reply@gauravpatil.online",
      name: "Gaurav Services",
      defaultReplyTo: "no-reply@gauravpatil.online",
      purpose: "OTP and system notifications.",
      isNoReply: true,
    },
    legacy: {
      email: "no-reply@gauravservices.eu.cc",
      name: "Gaurav Services",
      defaultReplyTo: "no-reply@gauravservices.eu.cc",
      purpose: "Legacy OTP and system notifications.",
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
