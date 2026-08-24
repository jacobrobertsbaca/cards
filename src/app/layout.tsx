import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const siteUrl = "https://jacobrobertsbaca.github.io/cards";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cards",
    template: "%s · Cards",
  },
  description: "Play card games easily",
  applicationName: "Cards",
  keywords: ["Oh Hell", "card game", "cards", "trick-taking", "multiplayer"],
  category: "games",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Cards",
    title: "Cards",
    description: "Play card games easily",
  },
  twitter: {
    card: "summary",
    title: "Cards",
    description: "Play card games easily",
  },
  appleWebApp: {
    capable: true,
    title: "Cards",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16352b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-left" expand />
        </TooltipProvider>
      </body>
    </html>
  );
}
