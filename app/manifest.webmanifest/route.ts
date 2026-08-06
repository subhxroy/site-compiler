import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "SiteCompiler",
    short_name: "Compiler",
    description: "AI Website Exporter & Code Generator",
    theme_color: "#040506",
    background_color: "#040506",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
