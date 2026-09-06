/**
 * Meta WhatsApp Cloud API Configuration & Environment Guards
 * 
 * Centralizes all Meta Cloud API parameters, Graph API versioning,
 * environment isolation, and startup configuration validation.
 */

export interface WhatsAppConfig {
  environment: "development" | "production";
  enabled: boolean;
  webhookVerifyToken: string;
  appId: string;
  appSecret: string;
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  graphApiVersion: string;
  graphBaseUrl: string;
}

function getEnvVar(key: string, fallback = ""): string {
  return process.env[key]?.trim() || fallback;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const environment = (process.env.WHATSAPP_ENVIRONMENT?.trim().toLowerCase() === "production" ? "production" : "development") as "development" | "production";
  const enabled = process.env.WHATSAPP_ENABLED !== "false";
  const graphApiVersion = getEnvVar("META_GRAPH_API_VERSION", "v21.0");

  return {
    environment,
    enabled,
    webhookVerifyToken: getEnvVar("WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
    appId: getEnvVar("META_APP_ID"),
    appSecret: getEnvVar("META_APP_SECRET"),
    businessAccountId: getEnvVar("WHATSAPP_BUSINESS_ACCOUNT_ID"),
    phoneNumberId: getEnvVar("WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: getEnvVar("WHATSAPP_ACCESS_TOKEN"),
    graphApiVersion,
    graphBaseUrl: `https://graph.facebook.com/${graphApiVersion}`,
  };
}

/**
 * Validates configuration health. Does not throw during module loading,
 * returning structured diagnostics for safe logging and observability.
 */
export function validateWhatsAppConfig(): { valid: boolean; missingKeys: string[] } {
  const config = getWhatsAppConfig();
  const missingKeys: string[] = [];

  if (!config.webhookVerifyToken) missingKeys.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  if (!config.appSecret) missingKeys.push("META_APP_SECRET");
  if (!config.phoneNumberId) missingKeys.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!config.accessToken) missingKeys.push("WHATSAPP_ACCESS_TOKEN");

  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
}

/**
 * Resolves the public application base URL for all WhatsApp links,
 * 1-click notification links in admin emails, guidelines links, and GDPR data export archives.
 *
 * Defaults to: https://gauravpatil.site
 */
export function getWhatsAppBaseUrl(): string {
  const customUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (customUrl) {
    return customUrl.replace(/\/+$/, "");
  }

  return "https://gauravpatil.site";
}
