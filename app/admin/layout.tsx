import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import type { AdminSession } from "@/lib/admin/auth";
import { AdminSessionProvider } from "@/components/admin/context";
import { AdminThemeEnforcer } from "@/components/admin/layout";

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

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  let initialSession: AdminSession | null = null;

  if (sessionCookie) {
    try {
      initialSession = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        initialSession = JSON.parse(sessionCookie);
      } catch {
        initialSession = null;
      }
    }
  }

  return (
    <>
      {/* 1. Frame-0 Synchronous Script: Instantly removes .dark class before paint */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              document.documentElement.classList.remove('dark');
              document.documentElement.style.backgroundColor = '#FAFAFA';
              document.documentElement.style.colorScheme = 'light';
            } catch (e) {}
          `,
        }}
      />

      {/* 2. Unbreakable Frame-0 Server Style: Prevents dark theme flash permanently */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, html.dark, body, body.dark, :root, :root.dark {
              background-color: #FAFAFA !important;
              color: #000000 !important;
              color-scheme: light !important;
            }
          `,
        }}
      />

      {/* 3. Client Class Enforcer: Cleans .dark class on mount and restores on unmount */}
      <AdminThemeEnforcer />

      <div
        data-admin="true"
        className={`${adminSans.variable} ${adminMono.variable} font-admin-sans min-h-screen bg-[#FAFAFA] text-[#000000] antialiased relative selection:bg-black selection:text-white`}
        style={{ colorScheme: "light", backgroundColor: "#FAFAFA" }}
      >
        {/* Subtle Swiss grid background lines */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        <AdminSessionProvider initialSession={initialSession}>
          <div className="relative z-10">{children}</div>
        </AdminSessionProvider>
      </div>
    </>
  );
}
