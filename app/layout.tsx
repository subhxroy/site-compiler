import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { organizationSchema, personSchema } from "@/lib/seo/schema";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://site-compiler.netlify.app";

export const metadata: Metadata = {
  title: "SiteCompiler — AI Website Exporter & Code Generator",
  description: "Crawl any published website (Framer, Webflow, Wix) and compile it into clean, editable Static HTML, React TSX, or Next.js + Tailwind in a single ZIP.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "SiteCompiler — AI Website Exporter & Code Generator",
    description: "Convert published Framer, Webflow, and static websites into clean React TSX, Next.js 16, and Tailwind CSS code.",
    url: siteUrl,
    siteName: "SiteCompiler",
    images: [{ url: `${siteUrl}/og?title=${encodeURIComponent("SiteCompiler — Website to Code Platform")}`, width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteCompiler — AI Website Exporter & Code Generator",
    description: "Convert published Framer, Webflow, and static websites into clean React TSX, Next.js 16, and Tailwind CSS code.",
    images: [`${siteUrl}/og?title=${encodeURIComponent("SiteCompiler — Website to Code Platform")}`],
  },
};

import { AuthProvider } from "@/lib/firebase/auth-context";
import { PostHogProvider } from "@/lib/posthog";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = organizationSchema();
  const personJsonLd = personSchema();

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth`}>
      <head>
        <meta name="strix-verification" content="strix-verify-630d4e87255604878f201b170ae15e10" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className="min-h-full antialiased bg-[#040506] text-white flex flex-col selection:bg-[#ff6363]/30 selection:text-white">
        <PostHogProvider>
          <AuthProvider>
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
