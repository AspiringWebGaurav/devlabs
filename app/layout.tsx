import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevLabs — Minimal Prototype Sandbox",
  description: "Minimal sandbox environment optimized for Vercel Hobby plan with zero background polling.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
