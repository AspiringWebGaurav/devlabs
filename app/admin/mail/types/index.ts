import type {
  MailDocument,
  MailDraftDocument,
  MailRecipient,
  MailSenderKey,
  MailSendStatus,
} from "@/lib/dal/repositories/types";
import type { MailSenderIdentity } from "@/lib/email/mail-service";

export type {
  MailDocument,
  MailDraftDocument,
  MailRecipient,
  MailSenderKey,
  MailSendStatus,
  MailSenderIdentity,
};

export interface ComposeFormState {
  idempotencyKey: string;
  draftId?: string;
  senderKey: MailSenderKey;
  to: string; // Comma or newline separated in UI
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export interface MailFilterState {
  status?: MailSendStatus | "ALL";
  senderKey?: MailSenderKey | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}
