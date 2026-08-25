import type { Metadata } from "next";
import { TermsOfServiceContent } from "@/components/legal/TermsOfServiceContent";

export const metadata: Metadata = {
  title: "Terms of Service | Gaurav Portfolio",
  description:
    "Official Terms of Service, acceptable use, and engagement terms for Gaurav Portfolio.",
};

export default function TermsPage() {
  return <TermsOfServiceContent />;
}
