import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#040506",
};

export const metadata: Metadata = {
  title: "SiteCompiler — Standalone Admin Console",
  description: "Secure Administrator Console for managing SiteCompiler users, backend health, and export permissions.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "SiteCompiler Admin Console",
    description: "Restricted Administrative Management Portal",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <meta name="strix-verification" content="strix-verify-630d4e87255604878f201b170ae15e10" />
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="min-h-full antialiased bg-[#040506] text-[#9c9c9d] font-sans selection:bg-[#ff6363]/30 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
