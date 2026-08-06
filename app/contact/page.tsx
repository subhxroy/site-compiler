import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Contact & Support — SiteCompiler',
  description: 'Get in touch with the SiteCompiler team for feature requests, bug reports, enterprise inquiries, and compiler support.',
  path: '/contact',
});

export default function ContactPage() {
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Contact', item: '/contact' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-2xl mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Contact Support
          </div>
          <h1 className="text-4xl font-normal text-white">We&apos;re here to help.</h1>
          <p className="text-sm text-[#9c9c9d]">Questions about export formats, API access, or enterprise deployment?</p>
        </div>

        <div className="raycast-key-card p-8 space-y-6">
          <form className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#6a6b6c] uppercase tracking-wider block">Your Name</label>
              <input type="text" required placeholder="Subhankar Roy" className="w-full px-4 py-3 raycast-inset-input text-white text-sm outline-none focus:border-[#ff6363]/60" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#6a6b6c] uppercase tracking-wider block">Email Address</label>
              <input type="email" required placeholder="contact.subhroy@gmail.com" className="w-full px-4 py-3 raycast-inset-input text-white text-sm outline-none focus:border-[#ff6363]/60" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#6a6b6c] uppercase tracking-wider block">Message</label>
              <textarea rows={4} required placeholder="How can we help with your website compilation?" className="w-full px-4 py-3 raycast-inset-input text-white text-sm outline-none focus:border-[#ff6363]/60 resize-none" />
            </div>

            <button type="submit" className="w-full py-3.5 raycast-button-primary text-sm font-medium cursor-pointer">
              Send Message
            </button>
          </form>
        </div>

        <div className="text-center font-mono text-xs text-[#6a6b6c]">
          Direct email: <a href="mailto:contact.subhroy@gmail.com" className="text-[#ff6363] hover:underline">contact.subhroy@gmail.com</a>
        </div>
      </div>
    </main>
  );
}
