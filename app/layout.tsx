import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "./provider";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";
import { seoRepository } from "@/lib/dal/repositories/cms/seo.repository";
import { SEED_SEO } from "@/lib/dal/repositories/seed-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000319",
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seoResult = await seoRepository.getSeo();
    const seo = seoResult.data || SEED_SEO;

    const canonicalUrl = seo.canonicalUrl || "https://gauravpatil.online";
    const title = seo.title || "Gaurav's Portfolio";
    const description = seo.description || "Modern, Slick and Minimalist Developer Portfolio";

    return {
      metadataBase: new URL(canonicalUrl),
      title,
      description,
      keywords: seo.keywords && seo.keywords.length > 0 ? seo.keywords : ["Developer", "Portfolio", "Frontend", "Next.js"],
      authors: [{ name: seo.author || "Gaurav Patil" }],
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Gaurav Portfolio",
        images: seo.ogImageUrl ? [{ url: seo.ogImageUrl, width: 1200, height: 630 }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        creator: seo.twitterHandle || "@gauravpatil",
        images: seo.ogImageUrl ? [seo.ogImageUrl] : [],
      },
    };
  } catch {
    return {
      metadataBase: new URL("https://gauravpatil.online"),
      title: "Gaurav's Portfolio",
      description: "Modern, Slick and Minimalist Developer Portfolio",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <RouteProgressBar />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
