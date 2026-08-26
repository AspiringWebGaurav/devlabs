/**
 * Central Email Identity & Sender Configuration
 * Authenticated Domain: gauravservices.eu.cc
 *
 * Single Source of Truth for all portfolio email senders, purposes, and reply-to routing.
 */

export const AUTHENTICATED_EMAIL_DOMAIN = "gauravservices.eu.cc";

export type EmailIdentityType = "HELLO" | "SECURITY" | "HELP" | "NO_REPLY";

export interface EmailIdentity {
  type: EmailIdentityType;
  email: string;
  name: string;
  defaultReplyTo: string;
  purpose: string;
}

export const EMAIL_IDENTITIES: Record<EmailIdentityType, EmailIdentity> = {
  HELLO: {
    type: "HELLO",
    email: "hello@gauravservices.eu.cc",
    name: "Gaurav Patil",
    defaultReplyTo: "hello@gauravservices.eu.cc",
    purpose:
      "Public-facing communication, contact form inquiries, auto replies, and general visitor correspondence.",
  },
  SECURITY: {
    type: "SECURITY",
    email: "security@gauravservices.eu.cc",
    name: "Device Auth",
    defaultReplyTo: "security@gauravservices.eu.cc",
    purpose:
      "OTP emails, email verification, 2FA, login/security verification, password reset, security recovery & alerts.",
  },
  HELP: {
    type: "HELP",
    email: "help@gauravservices.eu.cc",
    name: "Gaurav Support",
    defaultReplyTo: "help@gauravservices.eu.cc",
    purpose:
      "Support requests, assistance, ticket notifications, and user help workflows.",
  },
  NO_REPLY: {
    type: "NO_REPLY",
    email: "no-reply@gauravservices.eu.cc",
    name: "Gaurav Services",
    defaultReplyTo: "no-reply@gauravservices.eu.cc",
    purpose:
      "Strictly non-reply automated system notifications where direct reply is not applicable.",
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
