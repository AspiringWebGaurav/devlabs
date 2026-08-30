import type { Metadata } from "next";
import { ChatLearnMoreContent } from "@/components/legal/ChatLearnMoreContent";

export const metadata: Metadata = {
  title: "Personal Assistant & Chat Guide | Gaurav Portfolio",
  description:
    "Explore the architectural purpose, preview mechanics, and privacy standards for the Gaurav Portfolio Personal Assistant.",
  alternates: {
    canonical: "https://gauravpatil.online/chat",
  },
  openGraph: {
    title: "Personal Assistant & Chat Guide | Gaurav Portfolio",
    description:
      "Architectural purpose, option mechanics, and privacy standards for the portfolio assistant.",
    url: "https://gauravpatil.online/chat",
    siteName: "Gaurav Portfolio",
    type: "website",
  },
};

export default function ChatGuidePage() {
  return <ChatLearnMoreContent />;
}
