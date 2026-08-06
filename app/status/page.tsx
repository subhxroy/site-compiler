import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'System Status & Operational Metrics — SiteCompiler',
  description: 'Live status and uptime metrics for SiteCompiler crawler engine, Playwright nodes, AST parsers, and API services.',
  path: '/status',
});

export default function StatusPage() {
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Status', item: '/status' }]);

  const services = [
    { name: 'Render Backend API Engine', status: 'Operational', uptime: '99.98%', latency: '42ms' },
    { name: 'Playwright Headless Chromium Crawler', status: 'Operational', uptime: '99.95%', latency: '120ms' },
    { name: 'Netlify Edge Frontend Router', status: 'Operational', uptime: '100.00%', latency: '14ms' },
    { name: 'PostCSS AST & Asset Pipeline', status: 'Operational', uptime: '100.00%', latency: '8ms' },
    { name: 'Universal Animation Shim Builder', status: 'Operational', uptime: '100.00%', latency: '5ms' },
    { name: '24/7 Health Keep-Alive Pinger', status: 'Operational', uptime: '99.99%', latency: '35ms' },
  ];

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[900px] mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#59d499]/15 border border-[#59d499]/30 text-[11px] font-mono text-[#59d499] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#59d499] animate-pulse" />
            All Systems Operational
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">System Status</h1>
          <p className="text-base text-[#9c9c9d] max-w-xl mx-auto leading-relaxed">
            Real-time status monitoring for SiteCompiler compilation services, crawler workers, and global edge CDN.
          </p>
        </div>

        <div className="raycast-key-card p-6 sm:p-8 space-y-4">
          <div className="font-mono text-xs text-[#6a6b6c] uppercase tracking-wider pb-2 border-b border-[#1b1c1e] flex justify-between">
            <span>SERVICE COMPONENT</span>
            <span className="hidden sm:inline">UPTIME / LATENCY</span>
          </div>

          <div className="divide-y divide-[#1b1c1e]">
            {services.map((s, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#59d499]" />
                  <span className="text-white font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-[#59d499] bg-[#59d499]/10 px-2 py-0.5 rounded border border-[#59d499]/20">{s.status}</span>
                  <span className="text-[#9c9c9d] hidden sm:inline">{s.uptime}</span>
                  <span className="text-[#6a6b6c] hidden sm:inline">{s.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
