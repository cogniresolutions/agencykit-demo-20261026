import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "AgencyKit", template: "%s · AgencyKit" },
  description: "Self-hosted, white-label agency platform for sub-accounts, leads, pipeline, conversations and AI websites.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every request is rendered dynamically so each response gets a fresh CSP nonce.
  await connection();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
