import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const adminSans = Geist({
  variable: "--font-admin-sans",
  subsets: ["latin"],
  display: "swap",
});

const adminMono = Geist_Mono({
  variable: "--font-admin-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin Panel | Gaurav Portfolio",
  description: "Administrator Control Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${adminSans.variable} ${adminMono.variable} font-admin-sans min-h-screen bg-[#FAFAFA] text-[#000000] antialiased relative selection:bg-black selection:text-white`}
      style={{ colorScheme: "light" }}
    >
      {/* Subtle Swiss grid background lines */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
