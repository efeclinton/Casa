import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example";

export const metadataBase = new URL(siteUrl);

export const metadata: Metadata = {
  title: "CASA | Verified student accommodation near UNN",
  description:
    "Browse verified student accommodation and campus market items near UNN, with trusted agents and secure listings.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-v2.png" },
    ],
  },
  openGraph: {
    title: "CASA | Verified student accommodation near UNN",
    description:
      "Browse verified student accommodation and campus market items near UNN, with trusted agents and secure listings.",
    siteName: "CASA",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/favicon-v2.png",
        width: 1200,
        height: 630,
        alt: "CASA logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CASA | Verified student accommodation near UNN",
    description:
      "Browse verified student accommodation and campus market items near UNN, with trusted agents and secure listings.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
