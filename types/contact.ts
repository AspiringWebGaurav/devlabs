export interface ContactFormPayload {
  name: string;
  email: string;
  category?: string;
  message: string;
  turnstileToken?: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  date: string;
  ip?: string;
}

export interface ContactApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}
