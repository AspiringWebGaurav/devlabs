/**
 * Shared Compact Email Layout & Presentation Engine
 *
 * Provides a standardized, compact, content-first email layout wrapper
 * and unified footers for all automated/transactional emails.
 */

export type EmailFooterType = "SECURITY" | "STANDARD" | "LEAD_ALERT" | "LIVE_CHAT" | "NONE";

export interface EmailFooterContext {
  termsUrl?: string;     // RAW URL string - escaped once inside renderEmailFooter
  privacyUrl?: string;   // RAW URL string - escaped once inside renderEmailFooter
  termsLabel?: string;   // Optional custom terms link label (e.g. "Terms for Live Chat")
  privacyLabel?: string; // Optional custom privacy link label (e.g. "Privacy for Live Chat")
  replyToEmail?: string; // RAW email string - escaped once inside renderEmailFooter
  brandName?: string;    // RAW brand string - escaped once inside renderEmailFooter
  contextTitle?: string; // Optional contextual title (e.g. "Live Chat with Gaurav")
}

export interface CompactEmailLayoutOptions {
  title: string;           // RAW title string - escaped once inside renderCompactEmailLayout
  bodyContentHtml: string; // Pre-escaped HTML content fragment
  footerType?: EmailFooterType;
  footerContext?: EmailFooterContext;
}

export const EMAIL_SPACING = {
  // Outer Container
  bodyPadding: "padding:16px;",
  containerMaxWidth: "max-width:540px;margin:0 auto;",

  // Tier 1: Standard Vertical Blocks (Strictly bottom-only to prevent stacking)
  greetingMargin: "margin:0 0 8px 0;",
  paragraphMargin: "margin:0 0 10px 0;",
  keyValMargin: "margin:0 0 4px 0;",
  helperTextMargin: "margin:0 0 6px 0;",
  footerMargin: "margin:0;",

  // Tier 2: Structural / Embedded Primitives (Explicitly bounded vertical gaps)
  codeBlockMargin: "margin:12px 0 10px 0;",   // Isolated OTP display block
  buttonBlockMargin: "margin:12px 0 10px 0;", // Isolated action CTA button
  signoffMargin: "margin:10px 0 0 0;",        // Sign-off line top separator
  dividerMargin: "margin:14px 0 10px 0;",     // Footer divider top/bottom gap
} as const;

export const EMAIL_TYPOGRAPHY = {
  fontSans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  fontMono: "-apple-system,BlinkMacSystemFont,'SFMono-Regular',Consolas,Menlo,monospace",

  sizeBody: "14px",
  sizeSmall: "13px",
  sizeFooter: "12px",
  sizeOtp: "28px",

  lineHeightBody: "1.45",
  lineHeightCode: "1.15",
  lineHeightFooter: "1.4",

  colorHeading: "#111827",
  colorBody: "#374151",
  colorMuted: "#6b7280",
  colorFooter: "#64748b",
  colorLink: "#2563eb",
  colorDivider: "#e2e8f0",
} as const;

function escapeAttributeOrText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderEmailFooter(
  type: EmailFooterType = "STANDARD",
  context?: EmailFooterContext
): string {
  if (type === "NONE") return "";

  const divider = `<hr style="border:none;border-top:1px solid ${EMAIL_TYPOGRAPHY.colorDivider};${EMAIL_SPACING.dividerMargin}" />`;

  if (type === "SECURITY") {
    const terms = context?.termsUrl ? `<a href="${escapeAttributeOrText(context.termsUrl)}" style="color:${EMAIL_TYPOGRAPHY.colorMuted};text-decoration:none;">Terms</a>` : "";
    const privacy = context?.privacyUrl ? `<a href="${escapeAttributeOrText(context.privacyUrl)}" style="color:${EMAIL_TYPOGRAPHY.colorMuted};text-decoration:none;">Privacy</a>` : "";
    const links = [terms, privacy].filter(Boolean).join(` &nbsp;|&nbsp; `);

    return `
      ${divider}
      <p style="${EMAIL_SPACING.footerMargin}font-size:${EMAIL_TYPOGRAPHY.sizeFooter};color:${EMAIL_TYPOGRAPHY.colorFooter};line-height:${EMAIL_TYPOGRAPHY.lineHeightFooter};">
        <span>${escapeAttributeOrText(context?.brandName || "Gaurav Services")}</span>
        ${links ? ` &nbsp;&bull;&nbsp; ${links}` : ""}
      </p>
    `;
  }

  if (type === "LEAD_ALERT") {
    const rawReplyEmail = context?.replyToEmail || "";
    const safeAttrEmail = escapeAttributeOrText(rawReplyEmail);
    const safeTextEmail = escapeAttributeOrText(rawReplyEmail);
    return `
      ${divider}
      <p style="${EMAIL_SPACING.footerMargin}font-size:${EMAIL_TYPOGRAPHY.sizeFooter};color:${EMAIL_TYPOGRAPHY.colorFooter};line-height:${EMAIL_TYPOGRAPHY.lineHeightFooter};">
        To reply directly, hit "Reply" in your email client to message <a href="mailto:${safeAttrEmail}" style="color:${EMAIL_TYPOGRAPHY.colorLink};text-decoration:none;">${safeTextEmail}</a>.
      </p>
    `;
  }

  if (type === "LIVE_CHAT") {
    const termsLabel = context?.termsLabel || "Terms";
    const privacyLabel = context?.privacyLabel || "Privacy";
    const terms = context?.termsUrl
      ? `<a href="${escapeAttributeOrText(context.termsUrl)}" style="color:#7C3AED;text-decoration:underline;text-underline-offset:2px;font-weight:500;">${escapeAttributeOrText(termsLabel)}</a>`
      : "";
    const privacy = context?.privacyUrl
      ? `<a href="${escapeAttributeOrText(context.privacyUrl)}" style="color:#7C3AED;text-decoration:underline;text-underline-offset:2px;font-weight:500;">${escapeAttributeOrText(privacyLabel)}</a>`
      : "";
    const links = [terms, privacy].filter(Boolean).join(` &nbsp;&bull;&nbsp; `);
    const brand = escapeAttributeOrText(context?.brandName || "Gaurav Patil");

    return `
      ${divider}
      <div style="font-size:11px;color:#94a3b8;line-height:1.3;margin:0;">
        <span>&copy; ${brand}</span>${links ? ` &nbsp;&bull;&nbsp; ${links}` : ""}
      </div>
    `;
  }

  return `
    ${divider}
    <p style="${EMAIL_SPACING.footerMargin}font-size:${EMAIL_TYPOGRAPHY.sizeFooter};color:${EMAIL_TYPOGRAPHY.colorFooter};line-height:${EMAIL_TYPOGRAPHY.lineHeightFooter};">
      <span>Sent via Gaurav Services</span> &nbsp;&bull;&nbsp;
      <a href="https://gauravpatil.online" style="color:${EMAIL_TYPOGRAPHY.colorLink};text-decoration:underline;">gauravpatil.online</a>
    </p>
  `;
}

export function renderCompactEmailLayout(options: CompactEmailLayoutOptions): string {
  const safeTitle = escapeAttributeOrText(options.title);
  const footerHtml = renderEmailFooter(options.footerType, options.footerContext);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:8px 12px;background-color:#ffffff;font-family:${EMAIL_TYPOGRAPHY.fontSans};font-size:${EMAIL_TYPOGRAPHY.sizeBody};color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightBody};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="left" style="border-collapse:collapse;margin:0;max-width:540px;width:100%;">
    <tr>
      <td align="left" style="padding:0;font-family:${EMAIL_TYPOGRAPHY.fontSans};font-size:${EMAIL_TYPOGRAPHY.sizeBody};color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightBody};text-align:left;">
        ${options.bodyContentHtml}
        ${footerHtml}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
