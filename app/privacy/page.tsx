import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Privacy Policy — SiteCompiler',
  description: 'SiteCompiler privacy policy, data collection policies, and compiler security overview.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <main className="pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-8 text-sm text-[#9c9c9d] leading-relaxed">
        <h1 className="text-3xl font-normal text-white">Privacy Policy</h1>
        <p className="font-mono text-xs text-[#6a6b6c]">Last updated: August 6, 2026</p>
        <div className="raycast-key-card p-8 space-y-4">
          <h2 className="text-lg font-medium text-white">Data Processing & Local Exports</h2>
          <p>
            SiteCompiler operates as a developer compilation tool. When you submit a URL for compilation, our headless Playwright node fetches public DOM assets (images, stylesheets, web fonts, icons) to bundle them into a downloadable ZIP archive.
          </p>
          <p>
            We do not store target website data permanently on third-party servers. All compilation outputs are packaged locally into ZIP files for instant user download.
          </p>
        </div>
      </div>
    </main>
  );
}
