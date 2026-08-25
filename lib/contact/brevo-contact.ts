/**
 * Brevo Contact Form Adapter
 * Forwards requests to the centralized Email Subsystem (@/lib/email).
 */

import {
  dispatchContactFormWorkflow,
  ContactFormWorkflowParams,
  ContactFormWorkflowResult,
} from "@/lib/email";

export type BrevoContactDispatchParams = ContactFormWorkflowParams;
export type BrevoContactDispatchResult = ContactFormWorkflowResult;

/**
 * Dispatches contact form emails via the centralized Brevo service.
 */
export async function dispatchBrevoContactEmails(
  params: BrevoContactDispatchParams
): Promise<BrevoContactDispatchResult> {
  return dispatchContactFormWorkflow(params);
}
