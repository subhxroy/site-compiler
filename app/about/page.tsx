import React from 'react';
import Image from 'next/image';
import { 
  ExternalLink, 
  MapPin, 
  Sparkles, 
  Globe, 
  Code, 
  Layers, 
  ArrowUpRight, 
  Mail,
  CheckCircle2
} from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { personSchema, breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'About & Founder — Subhankar Roy | SiteCompiler',
  description: 'Learn about SiteCompiler and founder Subhankar Roy (Subh Roy) — Full-stack developer, Framer developer, and AI builder from Assam, India.',
  path: '/about',
});

// Brand Icons
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XTwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function AboutPage() {
  const pSchema = personSchema();
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'About', item: '/about' }]);

  const portfolioProjects = [
    {
      name: 'SiteCompiler',
      category: 'AI Website Compiler & Code Generator',
      description: 'An open-source website compilation engine that turns published Framer, Webflow, and visual builder sites into clean Next.js 15, React TSX, and Tailwind CSS codebases.',
      tech: ['Next.js 15', 'TypeScript', 'Tailwind CSS', 'Cheerio', 'Playwright'],
      link: 'https://site-compiler.netlify.app',
      isCurrent: true
    },
    {
      name: 'Agentic OS',
      category: 'Autonomous AI Agent Framework',
      description: 'An intelligent agentic operating system designed for orchestrating autonomous AI agents, multi-step LLM task workflows, code generation pipelines, and context-aware execution.',
      tech: ['TypeScript', 'Node.js', 'AI Agents', 'LLM Workflows', 'OpenAI / Claude API'],
      link: 'https://github.com/subhxroy'
    },
    {
      name: 'Anonym',
      category: 'Performance-Driven Modern Web App',
      description: 'A modern web project built with an emphasis on ultra-fast performance, dark-mode visual aesthetics, responsive UI components, and seamless user experience.',
      tech: ['React', 'TypeScript', 'Tailwind CSS', 'Framer', 'UI/UX Design'],
      link: 'https://subhxroy.framer.website/work/anonym'
    },
    {
      name: 'MeatDae',
      category: 'Food Delivery & E-Commerce Platform',
      description: 'A modern food delivery and e-commerce web platform designed and engineered for real-time order tracking, payment processing, and smooth ordering experience.',
      tech: ['JavaScript', 'Firebase', 'Razorpay', 'UI/UX Design'],
      link: 'https://subhxroy.framer.website/work/meatdae'
    },
    {
      name: 'BS1Fit Gym',
      category: 'Fitness & Gym Platform',
      description: 'A sleek, high-energy responsive website designed to showcase personal training programs, gym memberships, and coaching services.',
      tech: ['Framer', 'Responsive Design', 'UI/UX Design'],
      link: 'https://subhxroy.framer.website/work/bs1fitgym'
    },
    {
      name: 'Bellagio',
      category: 'Fine-Dining Restaurant Website',
      description: 'A luxury restaurant web experience showcasing culinary menus, table reservations, dining ambiance, and event booking.',
      tech: ['Framer', 'UI/UX Design', 'Visual Aesthetics'],
      link: 'https://subhxroy.framer.website/work/bellagio'
    }
  ];

  const skills = [
    { title: 'Full-Stack Development', items: ['Next.js 15 App Router', 'React 19 & TSX', 'TypeScript', 'Node.js & Express', 'Tailwind CSS'] },
    { title: 'Visual Builders & Design', items: ['Framer Development', 'Figma UI/UX', 'Component Systems', 'Dark Mode & Glassmorphism'] },
    { title: 'AI & Systems Engineering', items: ['AI Agentic Frameworks (Agentic OS)', 'AI Compiler Pipelines', 'Playwright & Cheerio', 'Firebase & Cloud Services'] },
  ];

  return (
    <main className="pt-28 pb-24 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-4xl mx-auto px-6 space-y-16">
        
        {/* Header Badge */}
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#ff6363]" />
            About SiteCompiler & Founder
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            Built by Subhankar Roy.
          </h1>
          <p className="text-base sm:text-lg text-[#9c9c9d] max-w-2xl leading-relaxed">
            Full-stack developer, Framer developer, UI/UX designer, and AI builder creating high-performance web products, SaaS applications, and compiler tooling.
          </p>
        </div>

        {/* Main Founder Profile Card */}
        <div className="raycast-key-card p-8 sm:p-10 border border-[#2f3031] rounded-2xl bg-[#0d0e10]/80 backdrop-blur-md space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            
            {/* Photo Avatar */}
            <div className="relative flex-none">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-[#ff6363]/40 shadow-xl shadow-[#ff6363]/10 relative bg-[#18191c]">
                <Image 
                  src="/subhankar.jpg" 
                  alt="Subhankar Roy" 
                  width={160} 
                  height={160}
                  priority
                  className="w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#1b1c1e] border border-[#2f3031] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-emerald-400 font-medium uppercase tracking-wider">Building</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-4 text-center sm:text-left flex-1">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Subhankar Roy</h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1f2023] text-[#a0a0a2] border border-[#333438]">Subh Roy</span>
                </div>
                <p className="text-sm font-mono text-[#ff6363] font-medium">Founder & Lead Architect, SiteCompiler</p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-[#9c9c9d] mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ff6363]" />
                  <span>Silchar, Assam, India</span>
                </div>
              </div>

              <p className="text-sm text-[#a0a0a2] leading-relaxed">
                Full-stack web developer and AI builder specializing in building premium visual websites, AI-powered applications (like Agentic OS), SaaS systems, and developer tools. Driven by clean architecture, user-centric UI/UX design, and open-source software.
              </p>

              {/* Portfolio Link & Social Links */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <a 
                  href="https://subhxroy.framer.website" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] text-white font-medium text-xs transition-all shadow-md shadow-[#ff6363]/20"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Portfolio (subhxroy.framer.website)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </a>

                <div className="flex items-center gap-1.5 bg-[#1b1c1e] p-1 rounded-lg border border-[#2f3031]">
                  <a 
                    href="https://github.com/subhxroy/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="GitHub @subhxroy"
                    className="p-2 text-[#9c9c9d] hover:text-white hover:bg-[#28292c] rounded-md transition-all"
                  >
                    <GithubIcon />
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/subhxroy/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="LinkedIn @subhxroy"
                    className="p-2 text-[#9c9c9d] hover:text-white hover:bg-[#28292c] rounded-md transition-all"
                  >
                    <LinkedinIcon />
                  </a>
                  <a 
                    href="https://x.com/subhxroy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Twitter / X @subhxroy"
                    className="p-2 text-[#9c9c9d] hover:text-white hover:bg-[#28292c] rounded-md transition-all"
                  >
                    <XTwitterIcon />
                  </a>
                  <a 
                    href="https://www.instagram.com/subhroyx/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Instagram @subhroyx"
                    className="p-2 text-[#9c9c9d] hover:text-white hover:bg-[#28292c] rounded-md transition-all"
                  >
                    <InstagramIcon />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Why SiteCompiler Was Created */}
        <div className="raycast-key-card p-8 space-y-6 text-sm text-[#9c9c9d] leading-relaxed border border-[#2f3031]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ff6363]/10 border border-[#ff6363]/30 text-[#ff6363]">
              <Code className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">The Story Behind SiteCompiler</h2>
          </div>
          <p>
            Modern visual site builders like Framer, Webflow, and Wix have transformed how creators and agencies design web experiences. However, keeping production code trapped within proprietary visual editors introduced a major limitation: <strong className="text-white">platform lock-in</strong>.
          </p>
          <p>
            When projects scale to require custom API backends, serverless edge functions, custom database queries, or self-hosted deployment, developers are often forced to manually rewrite visually-designed sites from scratch in React or Next.js.
          </p>
          <p>
            Subhankar built <strong className="text-white">SiteCompiler</strong> to solve this exact problem. By engineering a high-speed compilation pipeline that parses live published websites into clean, standard-compliant Next.js 15, React 19 TSX, and Tailwind CSS codebases, SiteCompiler gives creators absolute ownership over their frontend source code.
          </p>
        </div>

        {/* Portfolio Showcase Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#2f3031] pb-4">
            <div>
              <div className="text-xs font-mono text-[#ff6363] uppercase tracking-wider font-semibold">Featured Work</div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">Portfolio & GitHub Projects</h2>
            </div>
            <a 
              href="https://subhxroy.framer.website" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#9c9c9d] hover:text-[#ff6363] flex items-center gap-1 transition-colors"
            >
              <span>Explore all projects on subhxroy.framer.website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolioProjects.map((proj, idx) => (
              <div key={idx} className="raycast-key-card p-6 flex flex-col justify-between space-y-4 border border-[#2f3031] hover:border-[#ff6363]/50 transition-all group">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">{proj.category}</span>
                    {proj.isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff6363]/10 text-[#ff6363] border border-[#ff6363]/30">Active Flagship</span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-white group-hover:text-[#ff6363] transition-colors flex items-center gap-2">
                    {proj.name}
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[#9c9c9d] leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {proj.tech.map((t, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1b1c1e] text-[#6a6b6c] border border-[#2f3031]">
                        {t}
                      </span>
                    ))}
                  </div>

                  <a 
                    href={proj.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#ff6363] hover:underline font-mono"
                  >
                    <span>View Project</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills & Expertise Breakdown */}
        <div className="space-y-6">
          <div>
            <div className="text-xs font-mono text-[#ff6363] uppercase tracking-wider font-semibold">Technical Spectrum</div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">Skills & Specializations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {skills.map((s, idx) => (
              <div key={idx} className="raycast-key-card p-6 space-y-4 border border-[#2f3031]">
                <div className="flex items-center gap-2 text-white font-medium text-sm">
                  <Layers className="w-4 h-4 text-[#ff6363]" />
                  <span>{s.title}</span>
                </div>
                <ul className="space-y-2 text-xs text-[#9c9c9d]">
                  {s.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#ff6363]/70 flex-none" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="raycast-key-card p-8 sm:p-10 text-center space-y-6 border border-[#2f3031] bg-gradient-to-b from-[#111214] to-[#0a0b0d]">
          <div className="max-w-md mx-auto space-y-3">
            <h3 className="text-xl font-semibold text-white">Get in Touch with Subhankar</h3>
            <p className="text-xs text-[#9c9c9d] leading-relaxed">
              Interested in collaborating, enterprise compiler features, or web development projects? Reach out directly or visit the official portfolio.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <a 
              href="mailto:contact.subhroy@gmail.com"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1b1c1e] hover:bg-[#25262a] border border-[#2f3031] text-white transition-all"
            >
              <Mail className="w-4 h-4 text-[#ff6363]" />
              <span>contact.subhroy@gmail.com</span>
            </a>

            <a 
              href="https://subhxroy.framer.website"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#ff6363] hover:bg-[#ff4f4f] text-white transition-all shadow-md shadow-[#ff6363]/20"
            >
              <Globe className="w-4 h-4" />
              <span>subhxroy.framer.website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
