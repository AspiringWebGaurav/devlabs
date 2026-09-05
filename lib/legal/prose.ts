/**
 * Shared Legal Summary & Notification Prose Formatter
 *
 * Formats a clean, Google Payments-crafted announcement letter:
 * - Direct, professional opening
 * - Bolds the core update and effective date milestone
 * - Adds the "no action required / no impact" reassurance paragraph
 * - Renders the clean agreements list
 * - Zero internal logs, zero version numbers (e.g. 0.0.2)
 *
 * Client & Server safe (zero Node.js dependencies).
 */

export function escapeLegalHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface FormattedLegalProse {
  html: string;
  text: string;
  leadSentence: string;
  isBulletList: boolean;
  bulletItems: string[];
}

export function formatLegalSummaryProse(
  param1: string,
  param2: string,
  param3?: string
): FormattedLegalProse {
  // Gracefully handle either (docTitle, effectiveDate) or (rawSummary, docTitle, effectiveDate)
  const docTitle = param3 ? param2 : param1;
  const effectiveDate = param3 ? param3 : param2;

  const safeDocTitle = escapeLegalHtml(docTitle);
  const safeEffectiveDate = escapeLegalHtml(effectiveDate);

  const html = `
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#3c4043;">
      <strong>I am updating the public ${safeDocTitle} governing Gaurav Portfolio. Your ${safeDocTitle.toLowerCase()} will automatically update to reflect this change shortly (on or around ${safeEffectiveDate}).</strong>
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#3c4043;">
      This update won't affect how you explore the portfolio or interact with services, and you don't need to take any action. Your data sovereignty, rights, and privacy protections remain fully preserved.
    </p>
  `.trim();

  const text = `
I am updating the public ${docTitle} governing Gaurav Portfolio. Your ${docTitle.toLowerCase()} will automatically update to reflect this change shortly (on or around ${effectiveDate}).

This update won't affect how you explore the portfolio or interact with services, and you don't need to take any action. Your data sovereignty, rights, and privacy protections remain fully preserved.
  `.trim();

  return {
    html,
    text,
    leadSentence: `I am updating the public ${docTitle} governing Gaurav Portfolio.`,
    isBulletList: false,
    bulletItems: [],
  };
}
