import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | Gaurav Portfolio",
  description:
    "Official Privacy Policy, data governance, and anonymity rights for Gaurav Portfolio.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
