import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevLabs — Prototype & Sandbox Environment",
  description: "High-performance sandbox environment optimized for Vercel Hobby plan with zero background polling.",
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
      <body>
        <div className="mesh-background" aria-hidden="true">
          <div className="glow-orb-1" />
          <div className="glow-orb-2" />
          <div className="glow-orb-3" />
        </div>
        {children}
      </body>
    </html>
  );
}
