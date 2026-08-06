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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Free</div>
              <div className="text-3xl font-bold text-white">$0 <span className="text-xs font-normal text-[#6a6b6c]">/ month</span></div>
              <p className="text-xs text-[#9c9c9d]">For personal use with limited crawl depth and community support.</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Personal use</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Limited crawl depth</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Community support</li>
              </ul>
            </div>
            <Link href="/#export-form" className="w-full py-3 text-center raycast-button-primary text-xs font-medium block">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between border-[#ff6363]/50 relative shadow-[0_0_30px_rgba(255,99,99,0.15)]">
            <span className="absolute -top-3 right-6 text-[10px] font-mono px-2.5 py-0.5 rounded-[6px] bg-[#ff6363] text-black font-semibold uppercase">Popular</span>
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Pro</div>
              <div className="text-3xl font-bold text-white">$12 <span className="text-xs font-normal text-[#6a6b6c]">/ month</span></div>
              <p className="text-xs text-[#9c9c9d]">Unlimited crawl depth, all export formats, priority support, and API access.</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Unlimited crawl depth</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> All export formats</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Priority support</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> API access</li>
              </ul>
            </div>
            <Link href="/#export-form" className="w-full py-3 text-center raycast-button-primary text-xs font-medium block bg-[#ff6363] text-black hover:bg-[#ff7575]">
              Get Pro
            </Link>
          </div>

          {/* Enterprise */}
          <div className="raycast-key-card p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-lg font-medium text-white">Enterprise</div>
              <div className="text-3xl font-bold text-white">$49 <span className="text-xs font-normal text-[#6a6b6c]">/ month</span></div>
              <p className="text-xs text-[#9c9c9d]">Everything in Pro, plus team collaboration, custom integrations, and dedicated support.</p>
              <ul className="space-y-2.5 text-xs text-[#9c9c9d] pt-4 border-t border-[#1b1c1e]">
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Everything in Pro</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Team collaboration</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Custom integrations</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> Dedicated support</li>
                <li className="flex items-center gap-2"><span className="text-[#59d499]">✓</span> SLA guarantee</li>
              </ul>
            </div>
            <Link href="/contact" className="w-full py-3 text-center raycast-key-card text-xs font-medium block border border-[#2f3031] text-white hover:border-white">
              Contact Sales
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
