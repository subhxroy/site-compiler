import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteCompiler — Admin Portal Console",
  description: "Standalone Admin Management Portal for SiteCompiler.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#040506] text-[#9c9c9d]">
        {children}
      </body>
    </html>
  );
}
