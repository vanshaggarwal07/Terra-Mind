import type { Metadata } from "next";
import { Space_Grotesk, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

// --- Font loading (design system §2.2) ---
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-voice",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Terra-Mind — Future Intelligence for the NCR Corridor",
  description:
    "See every property's next ten years: approved infrastructure, forecasted price band, and confidence — sourced, cited, never a bare number.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
