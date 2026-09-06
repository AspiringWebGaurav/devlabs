import type { Metadata } from "next";
import { SecurityPolicyContent } from "@/components/legal/SecurityPolicyContent";

export const metadata: Metadata = {
  title: "Security Architecture & Trust | Gaurav Portfolio",
  description:
    "Overview of security architecture, authentication standards, spam protection, and responsible disclosure.",
  alternates: {
    canonical: "https://gauravpatil.site/security",
  },
  openGraph: {
    title: "Security Architecture & Trust | Gaurav Portfolio",
    description:
      "Overview of defensive security architecture, authentication standards, and responsible disclosure.",
    url: "https://gauravpatil.site/security",
    siteName: "Gaurav Portfolio",
    type: "website",
  },
};

export default function SecurityPage() {
  return <SecurityPolicyContent />;
}
