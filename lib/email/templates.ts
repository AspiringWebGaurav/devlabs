/**
 * Brevo Transactional Email Template Mapping
 *
 * Centralized registry of Brevo Template IDs.
 * - Active templates reference verified numeric IDs from Brevo.
 * - Future templates are typed with clean null fallbacks until created.
 */

export interface BrevoTemplateConfig {
  id: number | null;
  name: string;
  description: string;
  active: boolean;
}

export const BREVO_TEMPLATES = {
  // Verified Active Template in Brevo (ID: 1)
  CONTACT_FORM_AUTO_REPLY: {
    id: Number(process.env.BREVO_AUTO_REPLY_TEMPLATE_ID) || 1,
    name: "Contact Form Auto Reply",
    description: "Automated confirmation sent to visitor upon contact form submission",
    active: true,
  },

  // Future Template Specifications (Documented placeholders - not yet created in Brevo)
  SECURITY_OTP: {
    id: process.env.BREVO_OTP_TEMPLATE_ID ? Number(process.env.BREVO_OTP_TEMPLATE_ID) : null,
    name: "Security OTP Verification",
    description: "One-time passcode delivery for 2FA and admin verification",
    active: Boolean(process.env.BREVO_OTP_TEMPLATE_ID),
  },
  EMAIL_VERIFICATION: {
    id: process.env.BREVO_VERIFY_TEMPLATE_ID ? Number(process.env.BREVO_VERIFY_TEMPLATE_ID) : null,
    name: "Email Address Verification",
    description: "Cryptographic email confirmation link",
    active: Boolean(process.env.BREVO_VERIFY_TEMPLATE_ID),
  },
  PASSWORD_RESET: {
    id: process.env.BREVO_RESET_TEMPLATE_ID ? Number(process.env.BREVO_RESET_TEMPLATE_ID) : null,
    name: "Password / Access Recovery",
    description: "Security password reset and recovery token",
    active: Boolean(process.env.BREVO_RESET_TEMPLATE_ID),
  },
  SUPPORT_CONFIRMATION: {
    id: process.env.BREVO_SUPPORT_TEMPLATE_ID ? Number(process.env.BREVO_SUPPORT_TEMPLATE_ID) : null,
    name: "Support Request Confirmation",
    description: "Support ticket acknowledgment and reference ID",
    active: Boolean(process.env.BREVO_SUPPORT_TEMPLATE_ID),
  },
} as const;
