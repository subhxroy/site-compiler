import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';

  const content = `# SiteCompiler

> AI-powered website-to-code platform. Converts published websites (Framer, Webflow, Wix, and others) into clean, editable React, Next.js, HTML, and Tailwind projects.

## Docs
${siteUrl}/docs

## API
${siteUrl}/docs/api

## Pricing
${siteUrl}/pricing

## Blog
${siteUrl}/blog
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
