import React from 'react';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { productSchema, faqPageSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Pricing Plans — SiteCompiler',
  description: 'Simple, transparent pricing for website compilation. Export Framer, Webflow, and static sites into clean Next.js & React code.',
  path: '/pricing',
});

const pricingFaqs = [
  {
    question: 'Is there a free plan available?',
    answer: 'Yes, the Free plan is completely free forever. It includes personal use, limited crawl depth, and community support — no credit card required.',
  },
  {
    question: 'Can I export sites to commercial projects?',
    answer: 'Absolutely. All exported code, styles, and assets belong entirely to you with zero royalty or recurring platform lock-in.',
  },
  {
    question: 'What does Pro include that Free does not?',
    answer: 'Pro gives you unlimited crawl depth, all export formats (HTML, React, Next.js, Tailwind), priority support, and full API access for programmatic exports.',
  },
  {
    question: 'What additional features come with Enterprise?',
    answer: 'Enterprise includes everything in Pro plus team collaboration, custom integrations, dedicated support, and an SLA guarantee for mission-critical workloads.',
  },
];

export default function PricingPage() {
  const prodSchema = productSchema();
  const faqSchema = faqPageSchema(pricingFaqs);
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Pricing', item: '/pricing' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(prodSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">Simple pricing. Full ownership.</h1>
          <p className="text-base text-[#9c9c9d] leading-relaxed">
            Convert your sites once and host them anywhere with zero recurring platform lock-in.
          </p>
        </div>

        {/* Minimal Server Cost Notice */}
        <div className="bg-[#ff6363]/10 border border-[#ff6363]/30 rounded-xl p-4 text-center max-w-2xl mx-auto space-y-1">
          <div className="text-xs font-mono text-[#ff6363] uppercase font-medium">⚡ Fair Minimal Cost Model</div>
          <p className="text-xs text-[#9c9c9d] leading-relaxed">
            Exports are priced minimally per export strictly to cover backend Playwright headless browser rendering and server infrastructure costs. We keep it as affordable as possible.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Starter Export</div>
              <div className="text-3xl font-bold text-white">₹20 <span className="text-xs font-normal text-[#6a6b6c]">/ export</span></div>
              <p className="text-xs text-[#9c9c9d]">For smaller websites up to 10 pages per export.</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Up to 10 Pages captured</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> All export formats (HTML, React, Next.js)</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Full asset & CSS bundler</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Instant live progress logs</li>
              </ul>
            </div>
            <Link href="/#export-form" className="w-full py-3 text-center raycast-button-primary text-xs font-medium block">
              Start Export
            </Link>
          </div>

          {/* Standard Plan */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between border-[#ff6363]/50 relative shadow-[0_0_30px_rgba(255,99,99,0.15)]">
            <span className="absolute -top-3 right-6 text-[10px] font-mono px-2.5 py-0.5 rounded-[6px] bg-[#ff6363] text-black font-semibold uppercase">Most Popular</span>
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Medium Export</div>
              <div className="text-3xl font-bold text-white">₹40 <span className="text-xs font-normal text-[#6a6b6c]">/ export</span></div>
              <p className="text-xs text-[#9c9c9d]">For multi-page sites up to 20 pages per export.</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> 11 to 20 Pages captured</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> All export formats & Tailwind styling</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> High-res desktop, tablet & mobile screenshots</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Fast Playwright crawling</li>
              </ul>
            </div>
            <Link href="/#export-form" className="w-full py-3 text-center raycast-button-primary text-xs font-medium block bg-[#ff6363] text-black hover:bg-[#ff7575]">
              Start Export
            </Link>
          </div>

          {/* Scale Plan */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Large Export</div>
              <div className="text-3xl font-bold text-white">₹60+ <span className="text-xs font-normal text-[#6a6b6c]">/ export</span></div>
              <p className="text-xs text-[#9c9c9d]">₹20 per block of 10 pages for large sites (21+ pages).</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> 21+ Pages captured (+₹20 per 10 pages)</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Complete subpage depth crawling</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Clean TSX component extraction</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Admin fast approval</li>
              </ul>
            </div>
            <Link href="/#export-form" className="w-full py-3 text-center raycast-key-card text-xs font-medium block border border-[#2f3031] text-white hover:border-white">
              Start Export
            </Link>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="space-y-6 max-w-3xl mx-auto pt-8 border-t border-[#1b1c1e]">
          <h2 className="text-2xl font-medium text-white text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {pricingFaqs.map((faq, idx) => (
              <div key={idx} className="raycast-key-card p-6 space-y-2">
                <h3 className="text-base font-medium text-white">{faq.question}</h3>
                <p className="text-xs text-[#9c9c9d] leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
