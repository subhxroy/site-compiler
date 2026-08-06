import React from 'react';
import Link from 'next/link';
import { getAllDocsPages } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'API Reference — SiteCompiler Docs',
  description: 'REST API reference for programmatically triggering website compilation, polling job status, and downloading exported assets.',
  path: '/docs/api',
});

export default function ApiReferencePage() {
  const docs = getAllDocsPages();
  const apiDocs = docs.filter((d) => d.category === 'api');
  const breadcrumbSchema = breadcrumbListSchema([
    { name: 'Docs', item: '/docs' },
    { name: 'API Reference', item: '/docs/api' },
  ]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="raycast-key-card p-4 space-y-4">
            <div className="font-mono text-xs text-white uppercase tracking-wider font-semibold border-b border-[#1b1c1e] pb-2">
              Documentation
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[#ff6363] font-mono text-[10px] uppercase tracking-widest mb-1.5 font-semibold">Getting Started</div>
                <ul className="space-y-1.5 text-[#9c9c9d]">
                  {docs.filter(d => d.category === 'getting-started').map((d) => (
                    <li key={d.slugString}>
                      <Link href={`/docs/${d.slugString}`} className="block px-2 py-1 rounded transition-colors hover:text-white">
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[#ff6363] font-mono text-[10px] uppercase tracking-widest mb-1.5 font-semibold">API Reference</div>
                <ul className="space-y-1.5 text-[#9c9c9d]">
                  {docs.filter(d => d.category === 'api').map((d) => (
                    <li key={d.slugString}>
                      <Link href={`/docs/${d.slugString}`} className="block px-2 py-1 rounded transition-colors bg-[#ff6363]/15 text-[#ff6363] font-medium">
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <article className="lg:col-span-3 space-y-6">
          <div className="raycast-key-card p-8 sm:p-10 space-y-6">
            <div className="space-y-2 border-b border-[#1b1c1e] pb-6">
              <div className="font-mono text-xs text-[#ff6363] uppercase">API Reference</div>
              <h1 className="text-3xl font-normal text-white">REST API</h1>
              <p className="text-sm text-[#9c9c9d]">
                Programmatically trigger website compilation, poll job status, and download exported assets via HTTP.
              </p>
            </div>

            <div className="space-y-4 text-sm text-[#9c9c9d] leading-relaxed">
              <p>
                SiteCompiler exposes a simple REST API for integrating website compilation into your own tools, CI pipelines, or applications. All endpoints accept and return JSON.
              </p>

              <div className="raycast-key-card p-6 space-y-3">
                <h2 className="text-base font-medium text-white">Available Endpoints</h2>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#59d499]/15 text-[#59d499] font-semibold">POST</span>
                    <span className="text-white">/api/export</span>
                    <span className="text-[#6a6b6c]">— Trigger a new export job</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6] font-semibold">GET</span>
                    <span className="text-white">/api/job/:jobId/status</span>
                    <span className="text-[#6a6b6c]">— Poll job progress</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6] font-semibold">GET</span>
                    <span className="text-white">/api/job/:jobId/download</span>
                    <span className="text-[#6a6b6c]">— Download exported ZIP</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6] font-semibold">GET</span>
                    <span className="text-white">/api/job/:jobId/screenshot</span>
                    <span className="text-[#6a6b6c]">— Get preview screenshots</span>
                  </div>
                </div>
              </div>

              {apiDocs.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h2 className="text-base font-medium text-white">Detailed Docs</h2>
                  <ul className="space-y-2">
                    {apiDocs.map((doc) => (
                      <li key={doc.slugString}>
                        <Link href={`/docs/${doc.slugString}`} className="flex items-center justify-between px-4 py-3 raycast-key-card text-xs hover:border-white/20 transition-colors">
                          <span className="text-white font-medium">{doc.title}</span>
                          <span className="text-[#6a6b6c]">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
