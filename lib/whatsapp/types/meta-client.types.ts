/**
 * Meta Graph API Client Request & Response Types
 */

export interface MetaSendTextRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "text";
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface MetaSendInteractiveButtonsRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    header?: {
      type: "text";
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string; // Meta max 60 characters
    };
    action: {
      buttons: Array<{
        type: "reply";
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

export interface MetaSendDocumentRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "document";
  document: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
}

export interface MetaSendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string; // Outbound wamid
  }>;
}

export interface MetaMediaMetadataResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: "whatsapp";
}

export interface MetaApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}
