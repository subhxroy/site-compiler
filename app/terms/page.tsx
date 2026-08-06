import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Terms of Service — SiteCompiler',
  description: 'SiteCompiler terms of service and usage conditions for website compilation.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <main className="pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-8 text-sm text-[#9c9c9d] leading-relaxed">
        <h1 className="text-3xl font-normal text-white">Terms of Service</h1>
        <p className="font-mono text-xs text-[#6a6b6c]">Last updated: August 6, 2026</p>
        <div className="raycast-key-card p-8 space-y-4">
          <h2 className="text-lg font-medium text-white">Usage & Ownership Rights</h2>
          <p>
            By using SiteCompiler, you represent that you have the authority and rights to compile, download, and modify the target website assets.
          </p>
          <p>
            Generated code (HTML, CSS, JS, React TSX, Next.js) is provided as clean source code for your usage and hosting.
          </p>
        </div>
      </div>
    </main>
  );
}
