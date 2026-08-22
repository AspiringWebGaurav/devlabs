import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "./provider";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";
import { LiveVisitorTracker } from "@/components/visitor/LiveVisitorTracker";
import { SwitchyProvider } from "@/components/switchy/SwitchyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gauravpatil.online"),
  title: "Gaurav's Portfolio",
  description: "Modern, Slick and Minimalist Developer Portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var p = (window.location && window.location.pathname) || '';
                  var m = document.cookie.match(/(?:^|;\s*)vst_ban_state=([^;]+)/);
                  if (m && m[1] && m[1].length > 5 && !p.startsWith('/admin') && p !== '/banned') {
                    window.location.replace('/banned');
                    return;
                  }
                  if (p.startsWith('/admin')) {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                    document.documentElement.style.backgroundColor = '#FAFAFA';
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                    document.documentElement.style.backgroundColor = '#000319';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <RouteProgressBar />
          <LiveVisitorTracker />
          <SwitchyProvider />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
