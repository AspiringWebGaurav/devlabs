export type InquiryStatus = "unread" | "read" | "archived";

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt: string;
  status: InquiryStatus;
}

export interface InquiryFilterOptions {
  status?: InquiryStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}
