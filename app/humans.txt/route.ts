import { NextResponse } from 'next/server';

export async function GET() {
  const content = `/* TEAM */
Founder & Developer: Subhankar Roy
Location: India
Contact: contact.subhroy@gmail.com

/* SITE */
Built with: Next.js 15, TypeScript, Tailwind CSS, Playwright, Cheerio
Architecture: Single Node Compiler Pipeline
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
