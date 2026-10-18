import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { SessionProvider } from "@/components/session-provider";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND_TITLE,
  applicationName: BRAND_NAME,
  description: BRAND_DESCRIPTION,
  icons: {
    icon: {
      url: "/brand/catanova-mark.svg",
      type: "image/svg+xml",
      sizes: "any",
    },
    shortcut: "/brand/catanova-mark.svg",
  },
  openGraph: {
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    siteName: BRAND_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} min-h-full bg-background dark:scheme-dark`}
    >
      <body className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_8%_20%,rgb(200_238_131/10%),transparent_48%)] font-sans text-foreground antialiased selection:bg-accent-strong selection:text-background dark:bg-[radial-gradient(ellipse_at_8%_20%,rgb(200_238_131/4%),transparent_48%)]">
        <a
          className="fixed top-3 left-3 z-100 -translate-y-[160%] rounded-lg bg-foreground px-3.5 py-2.5 text-background focus:translate-y-0"
          href="#main-content"
        >
          Skip to content
        </a>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
