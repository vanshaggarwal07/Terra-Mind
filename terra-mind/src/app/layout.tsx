import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono } from "next/font/google";

import { ContactDock } from "@/components/contact/ContactDock";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

import "./globals.css";

const clashDisplay = localFont({
  src: "../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-display",
  weight: "200 700",
  display: "swap",
});

const generalSans = localFont({
  src: [
    { path: "../fonts/GeneralSans-Variable.woff2", weight: "200 700", style: "normal" },
    { path: "../fonts/GeneralSans-VariableItalic.woff2", weight: "200 700", style: "italic" },
  ],
  variable: "--font-body",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION =
  "Live land valuations, verified plots and infrastructure timelines along the Yamuna Expressway, Jewar Airport and Film City corridor. Track rates, run projections, talk to us on WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Terra-Mind · Plots near Jewar Airport & Yamuna Expressway",
    template: "%s · Terra-Mind",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Jewar Airport plots",
    "Yamuna Expressway land",
    "Noida International Airport property",
    "Film City Sector 21 YEIDA",
    "land investment Noida corridor",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Terra-Mind",
    title: "Terra-Mind · Plots near Jewar Airport & Yamuna Expressway",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/marketing/hero-expressway.jpg",
        width: 1200,
        height: 630,
        alt: "Yamuna Expressway corridor at sunset",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terra-Mind · Plots near Jewar Airport & Yamuna Expressway",
    description: SITE_DESCRIPTION,
    images: ["/marketing/hero-expressway.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${clashDisplay.variable} ${generalSans.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SiteHeader />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <SiteFooter />
          <ContactDock />
        </ThemeProvider>
      </body>
    </html>
  );
}
