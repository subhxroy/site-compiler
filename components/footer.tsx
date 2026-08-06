import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#1b1c1e] bg-[#040506] text-[#9c9c9d] text-xs pt-16 pb-12">
      <div className="max-w-[1100px] mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
        {/* Column 1: Brand */}
        <div className="col-span-2 space-y-3">
          <Link href="/" className="flex items-center gap-2 text-white font-medium text-sm">
            <div className="w-3.5 h-3.5 bg-[#ff6363] rotate-45 rounded-[2px]" />
            <span>SiteCompiler</span>
          </Link>
          <p className="text-[#6a6b6c] max-w-sm leading-relaxed">
            AI-powered website compilation platform. Crawl and convert Framer, Webflow, Wix, and static sites into clean Next.js 15, React TSX, and Tailwind CSS.
          </p>
          <div className="font-mono text-[11px] text-[#6a6b6c]">
            © {new Date().getFullYear()} SiteCompiler. Built by Subhankar Roy.
          </div>
        </div>

        {/* Column 2: Product */}
        <div className="space-y-2.5">
          <div className="font-mono text-[11px] text-[#ffffff] uppercase tracking-wider font-semibold">Product</div>
          <ul className="space-y-2">
            <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/roadmap" className="hover:text-white transition-colors">Roadmap</Link></li>
            <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
          </ul>
        </div>

        {/* Column 3: Exports & Platform */}
        <div className="space-y-2.5">
          <div className="font-mono text-[11px] text-[#ffffff] uppercase tracking-wider font-semibold">Exports</div>
          <ul className="space-y-2">
            <li><Link href="/framer-export" className="hover:text-white transition-colors">Framer Export</Link></li>
            <li><Link href="/webflow-export" className="hover:text-white transition-colors">Webflow Export</Link></li>
            <li><Link href="/wix-export" className="hover:text-white transition-colors">Wix Export</Link></li>
            <li><Link href="/framer-to-react" className="hover:text-white transition-colors">Framer to React</Link></li>
            <li><Link href="/framer-to-nextjs" className="hover:text-white transition-colors">Framer to Next.js</Link></li>
            <li><Link href="/webflow-to-react" className="hover:text-white transition-colors">Webflow to React</Link></li>
            <li><Link href="/website-to-tailwind" className="hover:text-white transition-colors">Website to Tailwind</Link></li>
          </ul>
        </div>

        {/* Column 4: Resources & Legal */}
        <div className="space-y-2.5">
          <div className="font-mono text-[11px] text-[#ffffff] uppercase tracking-wider font-semibold">Resources</div>
          <ul className="space-y-2">
            <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
            <li><Link href="/docs/api" className="hover:text-white transition-colors">API Reference</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About & Team</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      {/* Technical strip */}
      <div className="max-w-[1100px] mx-auto px-6 pt-6 border-t border-[#1b1c1e] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#6a6b6c] gap-2">
        <div className="flex items-center gap-2">
          <span>SiteCompiler v1.104</span>
          <span>•</span>
          <span>Next.js 15 App Router</span>
          <span>•</span>
          <span>100% Offline Bundled</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/rss.xml" className="hover:text-[#ff6363]">RSS Feed</a>
          <a href="/llms.txt" className="hover:text-[#ff6363]">llms.txt</a>
          <a href="/humans.txt" className="hover:text-[#ff6363]">humans.txt</a>
          <a href="/.well-known/security.txt" className="hover:text-[#ff6363]">security.txt</a>
        </div>
      </div>
    </footer>
  );
}
