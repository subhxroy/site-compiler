import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDocPageBySlug, getAllDocsPages } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const docs = getAllDocsPages();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocPageBySlug(slug);
  if (!doc) return buildMetadata({ title: 'Doc Not Found', description: '', path: `/docs/${slug.join('/')}` });

  return buildMetadata({
    title: `${doc.title} — SiteCompiler Docs`,
    description: doc.description,
    path: `/docs/${doc.slugString}`,
  });
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocPageBySlug(slug);
  if (!doc) notFound();

  const allDocs = getAllDocsPages();
  const breadcrumbSchema = breadcrumbListSchema([
    { name: 'Docs', item: '/docs' },
    { name: doc.title, item: `/docs/${doc.slugString}` },
  ]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="raycast-key-card p-4 space-y-4">
            <div className="font-mono text-xs text-white uppercase tracking-wider font-semibold border-b border-[#1b1c1e] pb-2">
              Documentation
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[#ff6363] font-mono text-[10px] uppercase tracking-widest mb-1.5 font-semibold">Getting Started</div>
                <ul className="space-y-1.5 text-[#9c9c9d]">
                  {allDocs.filter(d => d.category === 'getting-started').map((d) => (
                    <li key={d.slugString}>
                      <Link
                        href={`/docs/${d.slugString}`}
                        className={`block px-2 py-1 rounded transition-colors ${
                          d.slugString === doc.slugString ? 'bg-[#ff6363]/15 text-[#ff6363] font-medium' : 'hover:text-white'
                        }`}
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-[#ff6363] font-mono text-[10px] uppercase tracking-widest mb-1.5 font-semibold">API Reference</div>
                <ul className="space-y-1.5 text-[#9c9c9d]">
                  {allDocs.filter(d => d.category === 'api').map((d) => (
                    <li key={d.slugString}>
                      <Link
                        href={`/docs/${d.slugString}`}
                        className={`block px-2 py-1 rounded transition-colors ${
                          d.slugString === doc.slugString ? 'bg-[#ff6363]/15 text-[#ff6363] font-medium' : 'hover:text-white'
                        }`}
                      >
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <article className="lg:col-span-3 space-y-6">
          <div className="raycast-key-card p-8 sm:p-10 space-y-6">
            <div className="space-y-2 border-b border-[#1b1c1e] pb-6">
              <div className="font-mono text-xs text-[#ff6363] uppercase">{doc.category}</div>
              <h1 className="text-3xl font-normal text-white">{doc.title}</h1>
              <p className="text-sm text-[#9c9c9d]">{doc.description}</p>
            </div>

            <div
              className="prose prose-invert max-w-none text-sm text-[#9c9c9d] leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(doc.content) }}
            />
          </div>
        </article>
      </div>
    </main>
  );
}

function formatMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white pt-4 pb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-medium text-white pt-6 pb-2 border-b border-[#1b1c1e]">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white pt-8 pb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/```ts([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/```json([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/```bash([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1b1c1e] px-1.5 py-0.5 rounded text-[#ff6363] font-mono text-xs">$1</code>')
    .replace(/\n\n/g, '</p><p class="my-3">');
}
