import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Digital Twin",
  description:
    "Future intelligence for the Noida - Greater Noida - Yamuna Expressway - Jewar corridor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
