import { Feed } from 'feed';
import { getAllBlogPosts } from './mdx';

export function buildUnifiedFeed(): Feed {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';

  const feed = new Feed({
    title: 'SiteCompiler Changelog & Blog',
    description: 'Latest guides, features, and website compilation tutorials from SiteCompiler.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    image: `${siteUrl}/icon-512.png`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, SiteCompiler`,
    updated: new Date(),
    generator: 'SiteCompiler Feed Generator',
    feedLinks: {
      rss2: `${siteUrl}/rss.xml`,
      atom: `${siteUrl}/atom.xml`,
      json: `${siteUrl}/feed.json`,
    },
    author: {
      name: 'Subhankar Roy',
      email: 'contact.subhroy@gmail.com',
      link: `${siteUrl}/about`,
    },
  });

  const posts = getAllBlogPosts();

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/blog/${post.slug}`,
      link: `${siteUrl}/blog/${post.slug}`,
      description: post.description,
      content: post.content,
      author: [
        {
          name: post.author || 'Subhankar Roy',
          email: 'contact.subhroy@gmail.com',
          link: `${siteUrl}/about`,
        },
      ],
      date: new Date(post.publishedAt),
      image: post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`) : undefined,
    });
  });

  return feed;
}
