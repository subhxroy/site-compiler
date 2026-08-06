import React from 'react';
import Link from 'next/link';
import { getAllDocsPages } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Documentation — SiteCompiler',
  description: 'Complete documentation for SiteCompiler website exporter, REST API, React component output, and deployment guides.',
  path: '/docs',
});

export default function DocsIndexPage() {
  const docs = getAllDocsPages();
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Docs', item: '/docs' }]);

  const gettingStartedDocs = docs.filter((d) => d.category === 'getting-started');
  const apiDocs = docs.filter((d) => d.category === 'api');

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Documentation
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">SiteCompiler Docs</h1>
          <p className="text-base text-[#9c9c9d] leading-relaxed">
            Everything you need to compile, export, self-host, and programmatically integrate SiteCompiler into your workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Getting Started */}
          <div className="raycast-key-card p-8 space-y-4">
            <div className="font-mono text-xs text-[#ff6363] uppercase font-semibold">GETTING STARTED</div>
            <h2 className="text-xl font-medium text-white">Platform Basics</h2>
            <ul className="space-y-3 pt-2">
              {gettingStartedDocs.map((doc) => (
                <li key={doc.slugString}>
                  <Link href={`/docs/${doc.slugString}`} className="text-sm text-[#9c9c9d] hover:text-[#ff6363] transition-colors flex items-center justify-between">
                    <span>{doc.title}</span>
                    <span className="font-mono text-xs text-[#6a6b6c]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* API Reference */}
          <div className="raycast-key-card p-8 space-y-4">
            <div className="font-mono text-xs text-[#ff6363] uppercase font-semibold">API & INTEGRATION</div>
            <h2 className="text-xl font-medium text-white">REST API</h2>
            <ul className="space-y-3 pt-2">
              {apiDocs.map((doc) => (
                <li key={doc.slugString}>
                  <Link href={`/docs/${doc.slugString}`} className="text-sm text-[#9c9c9d] hover:text-[#ff6363] transition-colors flex items-center justify-between">
                    <span>{doc.title}</span>
                    <span className="font-mono text-xs text-[#6a6b6c]">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
