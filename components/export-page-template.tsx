import React from 'react';
import Link from 'next/link';
import { faqPageSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export interface ExportPageData {
  title: string;
  badge: string;
  headline: string;
  description: string;
  path: string;
  whatItProduces: string[];
  beforeSnippet: string;
  afterSnippet: string;
  limitations: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export function ExportPageTemplate({ data }: { data: ExportPageData }) {
  const faqSchema = faqPageSchema(data.faqs);
  const breadcrumbSchema = breadcrumbListSchema([{ name: data.title, item: data.path }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            {data.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white leading-tight">{data.headline}</h1>
          <p className="text-base text-[#9c9c9d] leading-relaxed">{data.description}</p>

          <div className="pt-4">
            <Link href="/#export-form" className="px-6 py-3.5 raycast-button-primary text-sm font-medium inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <span>Try Export Engine Now</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* What it produces */}
        <div className="raycast-key-card p-8 space-y-6">
          <div className="font-mono text-xs text-[#ff6363] uppercase tracking-wider font-semibold">OUTPUT SPECIFICATION</div>
          <h2 className="text-2xl font-medium text-white">What This Export Produces</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.whatItProduces.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-[#111214] rounded-[8px] border border-[#2f3031] text-xs text-[#9c9c9d]">
                <span className="text-[#59d499] text-base leading-none">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Before / After Comparison */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-medium text-white">Concrete Code Comparison</h2>
            <p className="text-xs text-[#9c9c9d]">See how raw platform markup is compiled into clean, maintainable code.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="raycast-key-card p-6 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs border-b border-[#1b1c1e] pb-2 text-[#6a6b6c]">
                <span>RAW PLATFORM DOM</span>
                <span className="text-red-400">Hashed / Complex</span>
              </div>
              <pre className="bg-[#111214] p-4 rounded-[8px] border border-[#2f3031] font-mono text-[11px] text-[#9c9c9d] overflow-x-auto">
                <code>{data.beforeSnippet}</code>
              </pre>
            </div>

            {/* After */}
            <div className="raycast-key-card p-6 space-y-3 border-[#59d499]/30">
              <div className="flex items-center justify-between font-mono text-xs border-b border-[#1b1c1e] pb-2 text-[#6a6b6c]">
                <span>SITECOMPILER OUTPUT</span>
                <span className="text-[#59d499]">Clean / Semantic</span>
              </div>
              <pre className="bg-[#111214] p-4 rounded-[8px] border border-[#2f3031] font-mono text-[11px] text-[#e6e6e6] overflow-x-auto">
                <code>{data.afterSnippet}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Limitations Stated Honestly */}
        <div className="raycast-key-card p-8 space-y-4 border-[#ff6363]/30">
          <div className="font-mono text-xs text-[#ff6363] uppercase tracking-wider font-semibold">HONEST TRANSPARENCY</div>
          <h2 className="text-xl font-medium text-white">Limitations & Considerations</h2>
          <ul className="space-y-2.5 text-xs text-[#9c9c9d]">
            {data.limitations.map((lim, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#ff6363]">•</span>
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-6 max-w-3xl mx-auto pt-6 border-t border-[#1b1c1e]">
          <h2 className="text-2xl font-medium text-white text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <div key={idx} className="raycast-key-card p-6 space-y-2">
                <h3 className="text-base font-medium text-white">{faq.question}</h3>
                <p className="text-xs text-[#9c9c9d] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="raycast-key-card p-10 text-center space-y-4 max-w-2xl mx-auto border-[#ff6363]/40">
          <h2 className="text-2xl font-medium text-white">Ready to compile your site?</h2>
          <p className="text-xs text-[#9c9c9d]">Enter any published site URL and download your clean ZIP bundle in seconds.</p>
          <div>
            <Link href="/#export-form" className="px-6 py-3.5 raycast-button-primary text-sm font-medium inline-block">
              Export Site to Clean Source
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
