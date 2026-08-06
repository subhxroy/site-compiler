import type { Metadata } from 'next';

export interface MetaInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
  keywords?: string[];
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://site-compiler.netlify.app';
const SITE_NAME = 'SiteCompiler';

export function buildMetadata({
  title,
  description,
  path,
  ogImage,
  noindex = false,
  keywords,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
}: MetaInput): Metadata {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${SITE_URL}${cleanPath}`;
  const pageTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const defaultOgImage = `${SITE_URL}/og?title=${encodeURIComponent(title)}`;
  const finalOgImage = ogImage ? (ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`) : defaultOgImage;

  const defaultKeywords = [
    'SiteCompiler',
    'website exporter',
    'Framer to React',
    'Webflow to Next.js',
    'HTML to Tailwind',
    'code generator',
    'website to code',
    'Framer exporter',
    'Webflow exporter',
    'Wix export',
  ];

  const metaKeywords = Array.from(new Set([...(keywords || []), ...defaultKeywords]));

  return {
    title: pageTitle,
    description,
    keywords: metaKeywords,
    authors: [{ name: author || 'Subhankar Roy', url: SITE_URL }],
    creator: 'Subhankar Roy',
    publisher: SITE_NAME,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            'max-video-preview': -1,
            'max-image-preview': 'none',
            'max-snippet': -1,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: finalOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type,
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        authors: [author || 'Subhankar Roy'],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      creator: '@subhroy',
      images: [finalOgImage],
    },
    other: {
      'apple-mobile-web-app-title': SITE_NAME,
    },
  };
}
