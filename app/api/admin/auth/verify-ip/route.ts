import { NextRequest, NextResponse } from "next/server";
import { ipSecurityService } from "@/lib/admin/services/ip-security.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse(
        renderHtmlPage({
          success: false,
          title: "Invalid Verification Link",
          message:
            "The IP verification link is missing required security parameters. Please restart sign-in to request a fresh authorization link.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const result = await ipSecurityService.verifyNewIpTransaction(token);

    if (!result.success) {
      const isAlreadyUsed = Boolean(result.error?.toLowerCase().includes("already been used"));
      const isExpired = Boolean(result.error?.toLowerCase().includes("expired"));

      return new NextResponse(
        renderHtmlPage({
          success: false,
          isAlreadyUsed,
          isExpired,
          title: isAlreadyUsed ? "Link Already Used" : isExpired ? "Link Expired" : "Verification Failed",
          message: isAlreadyUsed
            ? "This single-use security authorization link was already used to authorize your device. If your active sign-in tab is open, your session has already unlocked."
            : isExpired
            ? "This authorization link has expired. Please sign in again to request a fresh verification link."
            : result.error || "The IP authorization token is invalid or has expired.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return new NextResponse(
      renderHtmlPage({
        success: true,
        title: "IP Address Authorized",
        ipAddress: result.ipAddress || "Approved Location",
        message: `Your device IP address has been verified and registered. Your active Admin sign-in screen will advance automatically.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal verification error.";
    return new NextResponse(
      renderHtmlPage({
        success: false,
        title: "Verification Error",
        message: `An unexpected error occurred while verifying your IP address: ${message}. Please restart sign in.`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

function renderHtmlPage(options: {
  success: boolean;
  isAlreadyUsed?: boolean;
  isExpired?: boolean;
  title: string;
  message: string;
  ipAddress?: string;
}): string {
  // Determine color scheme and badge text
  let accentColor = "#10B981";
  let bgBadge = "#F0FDF4";
  let borderBadge = "#BBF7D0";
  let textBadge = "#15803D";
  let badgeLabel = "IP Authorization Granted";

  if (options.isAlreadyUsed) {
    accentColor = "#D97706";
    bgBadge = "#FFFBEB";
    borderBadge = "#FDE68A";
    textBadge = "#B45309";
    badgeLabel = "Link Already Consumed";
  } else if (options.isExpired || !options.success) {
    accentColor = "#EF4444";
    bgBadge = "#FEF2F2";
    borderBadge = "#FECACA";
    textBadge = "#B91C1C";
    badgeLabel = options.isExpired ? "Link Expired" : "Verification Notice";
  }

  // Format message text with prominent highlight chips
  let formattedMessage = options.message;
  if (options.success) {
    formattedMessage = `Your device IP address <span class="ip-chip">${options.ipAddress || "Approved Location"}</span> has been <span class="highlight-chip success">verified &amp; authorized</span>. Your active Admin sign-in session has unlocked and will advance automatically.`;
  } else if (options.isAlreadyUsed) {
    formattedMessage = `This single-use security authorization link was <span class="highlight-chip consumed">already used</span> to authorize your device. If your active sign-in tab is open, your session has already unlocked.`;
  } else if (options.isExpired) {
    formattedMessage = `This security authorization link has <span class="highlight-chip expired">expired</span>. Please sign in again to generate a fresh verification link.`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${options.title} &mdash; Admin Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      width: 100%;
      background-color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Background Architectural Dashed Guides (Exact Shiro Dimensions) */
    .bg-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      justify-content: center;
      z-index: 1;
    }
    .grid-inner {
      width: 100%;
      max-width: 960px;
      height: 100%;
      position: relative;
    }
    .guide-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
    }
    .guide-left { left: 0; }
    .guide-center { left: 50%; transform: translateX(-50%); }
    .guide-right { right: 0; }

    /* Center Content Container (Zero Cards, Large Readable Typography) */
    .content-container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 640px;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 0 auto;
    }
    @media (min-width: 640px) {
      .content-container { padding: 48px 32px; }
    }

    /* Minimalist Pill Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: ${textBadge};
      background-color: ${bgBadge};
      border: 1px solid ${borderBadge};
      padding: 6px 16px;
      border-radius: 9999px;
      margin-bottom: 24px;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: ${accentColor};
    }

    /* Shiro Large Headline Typography */
    .hero-title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #000000;
      line-height: 1.1;
      margin-bottom: 18px;
    }
    @media (min-width: 640px) {
      .hero-title { font-size: 46px; }
    }
    .purple-dot { color: #7C3AED; }

    /* Large Readable Body Description */
    .hero-description {
      font-size: 17px;
      line-height: 1.65;
      color: #334155;
      max-width: 540px;
      margin-bottom: 34px;
      font-weight: 450;
    }
    @media (min-width: 640px) {
      .hero-description { font-size: 19px; }
    }

    /* Prominent Highlight Badges & Chips */
    .highlight-chip {
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .highlight-chip.consumed {
      color: #9A3412;
      background-color: #FFEDD5;
      border: 1px solid #FDBA74;
    }
    .highlight-chip.success {
      color: #166534;
      background-color: #DCFCE7;
      border: 1px solid #86EFAC;
    }
    .highlight-chip.expired {
      color: #991B1B;
      background-color: #FEE2E2;
      border: 1px solid #FCA5A5;
    }

    .ip-chip {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #0F172A;
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Actions Group */
    .actions-group {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 420px;
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 480px) {
      .actions-group {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: auto;
        max-width: none;
      }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 28px;
      background-color: #0F172A;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.15s ease;
      min-height: 48px;
      cursor: pointer;
    }
    .btn-primary:hover {
      background-color: #1E293B;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      background-color: #FFFFFF;
      color: #334155;
      border: 1px solid #CBD5E1;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.15s ease;
      min-height: 48px;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background-color: #F8FAFC;
      color: #000000;
      border-color: #94A3B8;
    }

    .helper-text {
      font-size: 13px;
      color: #64748B;
      letter-spacing: 0.01em;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <!-- Architectural Dashed Grid Background -->
  <div class="bg-grid">
    <div class="grid-inner">
      <div class="guide-line guide-left">
        <svg width="1" height="100%" style="overflow: visible; color: #F1F5F9;">
          <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" />
        </svg>
      </div>
      <div class="guide-line guide-center">
        <svg width="1" height="100%" style="overflow: visible; color: #F1F5F9;">
          <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" />
        </svg>
      </div>
      <div class="guide-line guide-right">
        <svg width="1" height="100%" style="overflow: visible; color: #F1F5F9;">
          <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Perfectly Centered Minimalist Content -->
  <main class="content-container">
    <div class="status-badge">
      <span class="badge-dot"></span>
      <span>${badgeLabel}</span>
    </div>

    <h1 class="hero-title">
      ${options.title}<span class="purple-dot">.</span>
    </h1>

    <p class="hero-description">
      ${formattedMessage}
    </p>

    <div class="actions-group">
      <a href="/admin" class="btn-primary">
        <span>Open Admin Dashboard &rarr;</span>
      </a>
      <a href="${options.isAlreadyUsed || options.isExpired ? "/admin/login" : "/"}" class="btn-secondary">
        <span>${options.isAlreadyUsed || options.isExpired ? "Return to Sign In" : "Return to Portfolio"}</span>
      </a>
    </div>

    <p class="helper-text">
      ${
        options.success
          ? "Your active desktop session will advance automatically."
          : options.isAlreadyUsed
          ? "This link is single-use for security. If already authorized, you can proceed."
          : "Please restart sign in if you need a new authorization link."
      }
    </p>
  </main>
</body>
</html>`;
}
