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
      className={`${adminSans.variable} ${adminMono.variable} min-h-screen bg-[#FAFAFA] text-[#000000] font-sans antialiased`}
      style={{ colorScheme: "light" }}
    >
      {children}
    </div>
  );
}
