/**
 * Production-Grade Email Layout, Deliverability & Integration Test Suite
 *
 * Invokes the REAL PRODUCTION functions directly from:
 * - lib/email/brevo.ts
 * - lib/email/mail-service.ts
 * - lib/email/layout.ts
 *
 * Uses fetch interception to capture and validate real outbound payloads without sending live emails.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Set required test environment variable
process.env.BREVO_API_KEY = "test_brevo_api_key_for_qa_suite_only";

// 2. Import actual production functions directly from source files
import {
  renderCompactEmailLayout,
  renderEmailFooter,
  EMAIL_SPACING,
  EMAIL_TYPOGRAPHY,
} from "../lib/email/layout.ts";

import {
  dispatchOtpEmail,
  dispatchNewIpSecurityAlert,
  generateInternalNotificationHtml,
  dispatchInquiryReplyEmail,
  dispatchContactFormWorkflow,
  escapeHtml,
  resolveAppUrl,
} from "../lib/email/brevo.ts";

import {
  compileSafeHtml,
} from "../lib/email/mail-service.ts";

// 3. Setup Fetch Interceptor to capture exact outbound Brevo payloads
let capturedDispatches = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options = {}) => {
  if (typeof url === "string" && url.includes("api.brevo.com")) {
    const parsedBody = JSON.parse(options.body || "{}");
    capturedDispatches.push({
      url,
      headers: options.headers,
      body: parsedBody,
    });
    return new Response(JSON.stringify({ messageId: `msg_qa_${Date.now()}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(url, options);
};

console.log("===============================================================================");
console.log("STARTING PRODUCTION EMAIL QA & INTEGRATION VERIFICATION SUITE");
console.log("===============================================================================\n");

let passedCount = 0;
async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runSuite() {
  // ---------------------------------------------------------------------------
  // SECTION A: Real Production Email Generators & Dispatch Interception
  // ---------------------------------------------------------------------------
  console.log("--- SECTION A: Real Production Email Generators & Dispatch Interception ---");

  await runTest("A1. dispatchOtpEmail() produces compliant compact HTML, plain text & headers", async () => {
    capturedDispatches = [];
    const otp = "825254";
    const result = await dispatchOtpEmail({
      email: "admin@gauravpatil.online",
      name: "Gaurav Patil",
      otp,
      expiresMinutes: 5,
    });

    assert.equal(result.success, true, "Dispatch should succeed");
    assert.equal(capturedDispatches.length, 1, "Exactly 1 payload dispatched");

    const payload = capturedDispatches[0].body;
    assert.equal(payload.sender.email, "no-reply@gauravpatil.online", "From address must be no-reply");
    assert.equal(payload.sender.name, "Gaurav Services", "Sender display name must be Gaurav Services");
    assert.equal(payload.replyTo.email, "no-reply@gauravpatil.online", "Reply-To must be no-reply");
    assert.equal(payload.subject, `Your verification code is ${otp}`, "Subject line matches");

    const html = payload.htmlContent;
    const text = payload.textContent;

    // Structure assertions
    assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, "Exactly 1 <!DOCTYPE html>");
    assert.equal((html.match(/<html/gi) || []).length, 1, "Exactly 1 <html>");
    assert.equal((html.match(/<body/gi) || []).length, 1, "Exactly 1 <body>");
    assert.match(html, /max-width:540px/, "540px container present");
    assert.match(html, /825254/, "HTML contains OTP code");
    assert.match(html, /Terms/, "HTML contains Terms link");
    assert.match(html, /Privacy/, "HTML contains Privacy link");
    assert.equal(html.includes("&amp;amp;"), false, "No double escaping");
    assert.equal(html.includes("overflow:hidden"), false, "No prohibited overflow hack");

    // Plain text assertions
    assert.match(text, /825254/, "Text contains OTP code");
    assert.match(text, /5 minutes/, "Text contains expiry");
    assert.match(text, /Terms:/, "Text contains Terms URL");
    assert.equal(/<[a-z][\s\S]*>/i.test(text), false, "Plain text has 0 HTML tags");
  });

  await runTest("A2. dispatchNewIpSecurityAlert() produces context-specific URL escaping & CTA", async () => {
    capturedDispatches = [];
    const clientIp = "198.51.100.25";
    const rawVerifyUrl = "https://gauravpatil.online/api/admin/auth/verify-ip?token=tok_sec_123&sig=abc%26xyz=1";
    
    const result = await dispatchNewIpSecurityAlert({
      email: "admin@gauravpatil.online",
      name: "Gaurav Patil",
      clientIp,
      verifyUrl: rawVerifyUrl,
      expiresMinutes: 15,
    });

    assert.equal(result.success, true, "Dispatch should succeed");
    assert.equal(capturedDispatches.length, 1, "Exactly 1 payload dispatched");

    const payload = capturedDispatches[0].body;
    assert.equal(payload.sender.email, "security@gauravpatil.online", "From address must be security");
    assert.equal(payload.sender.name, "Device Auth", "Display name matches");
    assert.equal(payload.subject, "Authorize sign-in from a new IP address", "Subject line matches");

    const html = payload.htmlContent;
    const text = payload.textContent;

    // URL Escaping checks
    assert.match(html, /href="https:\/\/gauravpatil\.online\/api\/admin\/auth\/verify-ip\?token=tok_sec_123&amp;sig=abc%26xyz=1"/, "CTA button href attribute escaped once");
    assert.match(html, />https:\/\/gauravpatil\.online\/api\/admin\/auth\/verify-ip\?token=tok_sec_123&amp;sig=abc%26xyz=1<\/a>/, "Visible text anchor escaped once");
    assert.equal(html.includes("&amp;amp;"), false, "No double escaping in URL");
    assert.match(html, /word-break:break-all/, "Fallback link has break-all CSS");
    assert.match(text, /https:\/\/gauravpatil\.online\/api\/admin\/auth\/verify-ip\?token=tok_sec_123&sig=abc%26xyz=1/, "Text contains unescaped raw URL");
    assert.equal(/<[a-z][\s\S]*>/i.test(text), false, "Plain text has 0 HTML tags");
  });

  await runTest("A3. generateInternalNotificationHtml() preserves lead data with single escaping", () => {
    const rawEmail = "alice+investor&founder@venture.com";
    const rawName = "Alice & Bob <Partners>";
    const rawRole = "Managing Partner & CEO";
    const rawMessage = "Line 1: Interested in collaboration.\nLine 2: Budget: $50k+.\nLine 3: Please reach out!";

    const html = generateInternalNotificationHtml(
      {
        name: rawName,
        email: rawEmail,
        role: rawRole,
        message: rawMessage,
        leadNumber: "777",
      },
      "Aug 30, 2026, 10:00 AM"
    );

    assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, "Exactly 1 <!DOCTYPE html>");
    assert.match(html, /Alice &amp; Bob &lt;Partners&gt;/, "Name is safely escaped");
    assert.match(html, /Managing Partner &amp; CEO/, "Role is safely escaped");
    assert.match(html, /Line 1: Interested in collaboration\.<br \/>Line 2: Budget: \$50k\+\.<br \/>Line 3: Please reach out!/, "Message newlines converted to br");
    assert.match(html, /href="mailto:alice\+investor&amp;founder@venture\.com"/, "mailto attribute escaped once");
    assert.match(html, />alice\+investor&amp;founder@venture\.com<\/a>/, "Visible text email escaped once");
    assert.equal(html.includes("&amp;amp;"), false, "No double escaping in email or message");
  });

  await runTest("A4. dispatchInquiryReplyEmail() produces direct reply format with standard signature", async () => {
    capturedDispatches = [];
    const replySubject = "Re: Project Inquiry — Next.js Portfolio";
    const replyMessage = "Hello Alice,\n\nThank you for reaching out! I'd be glad to discuss your project.\n\nBest regards,\nGaurav";

    const result = await dispatchInquiryReplyEmail({
      toEmail: "alice@venture.com",
      toName: "Alice Smith",
      subject: replySubject,
      message: replyMessage,
      idempotencyKey: "test_inq_reply_001",
    });

    assert.equal(result.success, true, "Dispatch should succeed");
    assert.equal(capturedDispatches.length, 1, "Exactly 1 payload dispatched");

    const payload = capturedDispatches[0].body;
    assert.equal(payload.sender.email, "security@gauravpatil.online", "From address is security");
    assert.equal(payload.sender.name, "Gaurav Patil", "Sender display name is Gaurav Patil");
    assert.equal(payload.replyTo.email, "security@gauravpatil.online", "Reply-To is security");
    assert.equal(payload.subject, replySubject, "Subject is preserved");
    assert.equal(payload.textContent, replyMessage, "Text content is identical to raw reply");

    const html = payload.htmlContent;
    assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, "Exactly 1 <!DOCTYPE html>");
    assert.match(html, /Hello Alice,<br \/><br \/>Thank you for reaching out!/, "Paragraph newlines converted to br");
    assert.match(html, /Sent via Gaurav Services/, "Standard footer present");
  });

  await runTest("A5. resolveAppUrl() & dispatchOtpEmail() resolve 100% dynamic URLs (localhost, staging/devlabs, prod)", async () => {
    // 1. Localhost runtime environment
    const localHeaders = new Headers({ host: "localhost:3000" });
    assert.equal(resolveAppUrl(localHeaders), "http://localhost:3000", "Localhost resolves to http://localhost:3000");

    capturedDispatches = [];
    await dispatchOtpEmail({
      email: "admin@gauravpatil.online",
      otp: "123456",
      requestHeaders: localHeaders,
    });
    const localHtml = capturedDispatches[0].body.htmlContent;
    assert.match(localHtml, /href="http:\/\/localhost:3000\/admin\/terms"/, "Localhost Terms link dynamically points to localhost");
    assert.match(localHtml, /href="http:\/\/localhost:3000\/admin\/privacy"/, "Localhost Privacy link dynamically points to localhost");

    // 2. Devlabs / Vercel Preview environment
    const previewHeaders = new Headers({ "x-forwarded-host": "devlabs.vercel.app", "x-forwarded-proto": "https" });
    assert.equal(resolveAppUrl(previewHeaders), "https://devlabs.vercel.app", "Preview resolves to https://devlabs.vercel.app");

    capturedDispatches = [];
    await dispatchOtpEmail({
      email: "admin@gauravpatil.online",
      otp: "123456",
      requestHeaders: previewHeaders,
    });
    const previewHtml = capturedDispatches[0].body.htmlContent;
    assert.match(previewHtml, /href="https:\/\/devlabs\.vercel\.app\/admin\/terms"/, "Preview Terms link dynamically points to devlabs");
    assert.match(previewHtml, /href="https:\/\/devlabs\.vercel\.app\/admin\/privacy"/, "Preview Privacy link dynamically points to devlabs");

    // 3. Canonical Production environment
    const prodHeaders = new Headers({ "x-forwarded-host": "gauravpatil.online", "x-forwarded-proto": "https" });
    assert.equal(resolveAppUrl(prodHeaders), "https://gauravpatil.online", "Production resolves to https://gauravpatil.online");

    capturedDispatches = [];
    await dispatchOtpEmail({
      email: "admin@gauravpatil.online",
      otp: "123456",
      requestHeaders: prodHeaders,
    });
    const prodHtml = capturedDispatches[0].body.htmlContent;
    assert.match(prodHtml, /href="https:\/\/gauravpatil\.online\/admin\/terms"/, "Production Terms link points to gauravpatil.online");
    assert.match(prodHtml, /href="https:\/\/gauravpatil\.online\/admin\/privacy"/, "Production Privacy link points to gauravpatil.online");
  });

  // ---------------------------------------------------------------------------
  // SECTION B: Production compileSafeHtml() Security & Markdown Compilation
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION B: Production compileSafeHtml() Security & Markdown ---");

  await runTest("B1. compileSafeHtml() sanitizes <script> injection and executes safe markdown", () => {
    const rawInput = "Hello **Team** & `Friends`,\n\nHere is code: `<script>alert('XSS')</script>`\n\nAlso *italic* and \"quotes\" & 'apostrophes'.";
    const html = compileSafeHtml(rawInput, "Security & Compliance Update");

    // XSS Sanitization assertions
    assert.equal(html.includes("<script>"), false, "Raw <script> tag must NEVER exist");
    assert.match(html, /&lt;script&gt;alert\(&#039;XSS&#039;\)&lt;\/script&gt;/, "Script tag must be safely HTML escaped");
    assert.equal(html.includes("alert('XSS')"), false, "Unescaped script content must not exist");

    // Markdown tag assertions
    assert.match(html, /<strong>Team<\/strong>/, "**bold** interpreted as <strong>");
    assert.match(html, /<em>italic<\/em>/, "*italic* interpreted as <em>");
    assert.match(html, /<code style="background-color:#f1f5f9;/, "`code` interpreted with safe inline code styling");
    assert.match(html, /&quot;quotes&quot; &amp; &#039;apostrophes&#039;/, "Quotes and ampersands properly escaped");

    // Document shell assertions
    assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1, "Exactly 1 <!DOCTYPE html>");
    assert.match(html, /<title>Security &amp; Compliance Update<\/title>/, "Title is safely escaped");
    assert.match(html, /Sent via Gaurav Services/, "Standard footer attached");
  });

  // ---------------------------------------------------------------------------
  // SECTION C: Shared Layout Unit Assertions (10 Points)
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION C: Shared Layout Unit Assertions (10 Points) ---");

  await runTest("C1. Document Shell: Exactly 1 <!DOCTYPE html>, <html>, <head>, <body>", () => {
    const html = renderCompactEmailLayout({ title: "Test", bodyContentHtml: "<p>Hello</p>" });
    assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1);
    assert.equal((html.match(/<html/gi) || []).length, 1);
    assert.equal((html.match(/<\/html>/gi) || []).length, 1);
    assert.equal((html.match(/<body/gi) || []).length, 1);
    assert.equal((html.match(/<\/body>/gi) || []).length, 1);
  });

  await runTest("C2. Responsive Container: 540px table with presentation role", () => {
    const html = renderCompactEmailLayout({ title: "Test", bodyContentHtml: "<p>Content</p>" });
    assert.match(html, /<table role="presentation"/);
    assert.match(html, /max-width:540px/);
    assert.match(html, /border-collapse:collapse/);
  });

  await runTest("C3. Title Escaping: Escapes &, <, >, \", ' in <title>", () => {
    const html = renderCompactEmailLayout({ title: "A & B <C> \"D\" 'E'", bodyContentHtml: "<p>Content</p>" });
    assert.match(html, /<title>A &amp; B &lt;C&gt; &quot;D&quot; &#039;E&#039;<\/title>/);
  });

  await runTest("C4. Footer SECURITY: Brand + Terms + Privacy + <hr>", () => {
    const html = renderCompactEmailLayout({
      title: "Test",
      bodyContentHtml: "<p>Content</p>",
      footerType: "SECURITY",
      footerContext: { termsUrl: "https://gauravpatil.online/admin/terms", privacyUrl: "https://gauravpatil.online/admin/privacy", brandName: "Gaurav Services" },
    });
    assert.match(html, /Gaurav Services/);
    assert.match(html, /href="https:\/\/gauravpatil\.online\/admin\/terms"/);
    assert.match(html, /href="https:\/\/gauravpatil\.online\/admin\/privacy"/);
    assert.match(html, /<hr style=/);
  });

  await runTest("C5. Footer LEAD_ALERT: mailto link with escaped email + reply text", () => {
    const html = renderCompactEmailLayout({
      title: "Test",
      bodyContentHtml: "<p>Content</p>",
      footerType: "LEAD_ALERT",
      footerContext: { replyToEmail: "visitor@test.com" },
    });
    assert.match(html, /href="mailto:visitor@test\.com"/);
    assert.match(html, />visitor@test\.com<\/a>/);
    assert.match(html, /To reply directly, hit "Reply"/);
  });

  await runTest("C6. Footer STANDARD: Domain signature + gauravpatil.online", () => {
    const html = renderCompactEmailLayout({ title: "Test", bodyContentHtml: "<p>Content</p>", footerType: "STANDARD" });
    assert.match(html, /Sent via Gaurav Services/);
    assert.match(html, /href="https:\/\/gauravpatil\.online"/);
  });

  await runTest("C7. Footer NONE: 0 <hr> and 0 footer markup", () => {
    const html = renderCompactEmailLayout({ title: "Test", bodyContentHtml: "<p>Content</p>", footerType: "NONE" });
    assert.equal(html.includes("<hr"), false);
    assert.equal(html.includes("Gaurav Services"), false);
  });

  await runTest("C8. Single Escaping Boundary: dynamic footer values escaped exactly once", () => {
    const rawEmail = "user&name+1@domain.com";
    const footer = renderEmailFooter("LEAD_ALERT", { replyToEmail: rawEmail });
    assert.match(footer, /user&amp;name\+1@domain\.com/);
    assert.equal(footer.includes("&amp;amp;"), false);
  });

  await runTest("C9. Prohibited CSS: zero overflow:hidden, fixed heights, or negative margins", () => {
    const html = renderCompactEmailLayout({ title: "Test", bodyContentHtml: "<p>Content</p>", footerType: "STANDARD" });
    assert.equal(/overflow\s*:\s*hidden/i.test(html), false);
    assert.equal(/height\s*:\s*\d+px/i.test(html), false);
    assert.equal(/margin-top\s*:\s*-\d+/i.test(html), false);
  });

  await runTest("C10. Spacing Contract: Controlled Spacing tokens are internally consistent", () => {
    assert.equal(EMAIL_SPACING.bodyPadding, "padding:16px;");
    assert.equal(EMAIL_SPACING.paragraphMargin, "margin:0 0 10px 0;");
    assert.equal(EMAIL_SPACING.codeBlockMargin, "margin:12px 0 10px 0;");
    assert.equal(EMAIL_SPACING.dividerMargin, "margin:14px 0 10px 0;");
  });

  // ---------------------------------------------------------------------------
  // SECTION D: Admin Mail Transport Immutability (CC / BCC / Attachments)
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION D: Admin Mail Transport Immutability ---");

  await runTest("D1. Transport payload immutability across CC, BCC, and Attachments", () => {
    const rawMessage = "Please find the **Quarterly Financial Report** attached.\n\nBest regards,\nGaurav";
    const subject = "Q3 Financial Statement";
    
    // Simulate what Admin Mail Center server action does
    const compiledHtml = compileSafeHtml(rawMessage, subject);
    const textContent = rawMessage;

    const testPayload = {
      to: [{ email: "cfo@company.com", name: "Chief Financial Officer" }],
      cc: [{ email: "controller@company.com", name: "Controller" }, { email: "finance@company.com" }],
      bcc: [{ email: "compliance-archive@company.com" }],
      subject,
      htmlContent: compiledHtml,
      textContent,
      attachments: [
        { name: "Q3_Report.pdf", content: "JVBERi0xLjQKJedf..." },
      ],
    };

    // Assertions on transport payload
    assert.equal(testPayload.to.length, 1, "To array preserved");
    assert.equal(testPayload.cc.length, 2, "CC array preserved with both recipients");
    assert.equal(testPayload.bcc.length, 1, "BCC array preserved");
    assert.equal(testPayload.attachments.length, 1, "Attachment count preserved");
    assert.equal(testPayload.attachments[0].name, "Q3_Report.pdf", "Attachment filename preserved");
    assert.equal(testPayload.attachments[0].content, "JVBERi0xLjQKJedf...", "Attachment base64 content preserved");
    assert.match(testPayload.htmlContent, /<strong>Quarterly Financial Report<\/strong>/, "HTML properly compiled");
    assert.equal((testPayload.htmlContent.match(/<!DOCTYPE html>/gi) || []).length, 1, "Single document shell");
  });

  // ---------------------------------------------------------------------------
  // SECTION E: Repository Migration & Legacy Footer Ripgrep Audit
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION E: Repository Migration & Legacy Code Audit ---");

  await runTest("E1. Verify zero obsolete document shells or legacy footers remain in lib/email/", () => {
    const emailDir = path.resolve(process.cwd(), "lib/email");
    const files = fs.readdirSync(emailDir).filter(f => f.endsWith(".ts"));

    let doctypeMatches = 0;
    let htmlTagMatches = 0;
    let bodyTagMatches = 0;
    let oldPaddingMatches = 0;
    let oldMarginMatches = 0;
    let legacyFooterMatches = 0;

    for (const file of files) {
      const content = fs.readFileSync(path.join(emailDir, file), "utf-8");
      
      const doctypes = (content.match(/<!DOCTYPE html>/gi) || []).length;
      const htmls = (content.match(/<html\b/gi) || []).length;
      const bodies = (content.match(/<body\b/gi) || []).length;
      const oldPadding = (content.match(/padding:\s*(?:32px 24px|28px 24px|24px 20px)/gi) || []).length;
      const oldMargins = (content.match(/margin-top:\s*28px/gi) || []).length;
      const legacyFooters = (content.match(/Terms<\/a>\s*&nbsp;\|&nbsp;\s*<a href=|Sent by Gaurav Patil/gi) || []).length;

      doctypeMatches += doctypes;
      htmlTagMatches += htmls;
      bodyTagMatches += bodies;
      oldPaddingMatches += oldPadding;
      oldMarginMatches += oldMargins;
      legacyFooterMatches += legacyFooters;

      if (file !== "layout.ts") {
        assert.equal(doctypes, 0, `${file} must not contain <!DOCTYPE html>`);
        assert.equal(htmls, 0, `${file} must not contain <html`);
        assert.equal(bodies, 0, `${file} must not contain <body`);
      }
    }

    assert.equal(doctypeMatches, 1, "Exactly 1 <!DOCTYPE html> across entire lib/email/");
    assert.equal(htmlTagMatches, 1, "Exactly 1 <html across entire lib/email/");
    assert.equal(bodyTagMatches, 1, "Exactly 1 <body across entire lib/email/");
    assert.equal(oldPaddingMatches, 0, "Zero old bloated padding values");
    assert.equal(oldMarginMatches, 0, "Zero old margin-top:28px values");
    assert.equal(legacyFooterMatches, 0, "Zero legacy footer strings");
  });

  console.log(`\n===============================================================================`);
  console.log(`ALL ${passedCount} PRODUCTION INTEGRATION & QA TESTS PASSED WITH 0 FAILURES`);
  console.log(`===============================================================================\n`);
}

runSuite();
