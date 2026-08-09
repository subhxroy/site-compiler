import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'SiteCompiler — Website to Code Platform';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#040506',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Background Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,99,99,0.2) 0%, rgba(4,5,6,0) 70%)',
            }}
          />

          {/* Header Diamond */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#ff6363',
                transform: 'rotate(45deg)',
                borderRadius: '4px',
              }}
            />
            <span style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.02em', color: '#ffffff' }}>
              SiteCompiler
            </span>
          </div>

          {/* Dynamic Page Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px' }}>
            <span style={{ fontSize: '18px', fontFamily: 'monospace', color: '#ff6363', letterSpacing: '0.1em' }}>
              WEBSITE TO CODE ENGINE
            </span>
            <div
              style={{
                fontSize: '52px',
                fontWeight: 'normal',
                lineHeight: 1.15,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #1b1c1e',
              paddingTop: '24px',
              color: '#6a6b6c',
              fontSize: '18px',
              fontFamily: 'monospace',
            }}
          >
            <span>Framer · Webflow · Static HTML · React · Next.js 15</span>
            <span>https://sitecompiler.com</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
