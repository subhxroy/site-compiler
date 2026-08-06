import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { personSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'About & Founder — SiteCompiler',
  description: 'Learn about SiteCompiler and founder Subhankar Roy. Building open-source website compilation and code generation infrastructure.',
  path: '/about',
});

export default function AboutPage() {
  const pSchema = personSchema();
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'About', item: '/about' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-3xl mx-auto px-6 space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            About SiteCompiler
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">Built to eliminate website platform lock-in.</h1>
        </div>

        <div className="raycast-key-card p-8 space-y-6 text-sm text-[#9c9c9d] leading-relaxed">
          <p>
            SiteCompiler was founded by <strong className="text-white">Subhankar Roy</strong>, a web developer and AI builder based in Assam, India.
          </p>
          <p>
            Modern website builders like Framer and Webflow enable stunning visually-designed interfaces, but locking your code inside closed visual editors limits extensibility. Adding custom backend logic, embedding local database queries, or hosting on private cloud infrastructure often requires completely rewriting the frontend from scratch.
          </p>
          <p>
            SiteCompiler bridges this gap by turning published websites into clean, production-grade Next.js 15, React TSX, and Tailwind CSS code bases.
          </p>
        </div>

        {/* Founder Card */}
        <div className="raycast-key-card p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#111214] border border-[#2f3031] flex items-center justify-center text-3xl text-[#ff6363] font-bold flex-none">
            SR
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl font-medium text-white">Subhankar Roy</h2>
            <p className="text-xs text-[#ff6363] font-mono">Founder & Lead Architect</p>
            <p className="text-xs text-[#9c9c9d] leading-relaxed">
              Full-stack developer building AI-powered SaaS products, compilers, and modern web platforms.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
