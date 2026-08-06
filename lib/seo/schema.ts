const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://site-compiler.netlify.app';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'SiteCompiler',
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [
      'https://github.com/subhxroy/site-compiler',
      'https://twitter.com/subhroy',
      'https://linkedin.com/in/subhankarroy',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact.subhroy@gmail.com',
      contactType: 'customer support',
      availableLanguage: ['English'],
    },
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: 'Subhankar Roy',
    alternateName: 'Subh Roy',
    url: SITE_URL,
    jobTitle: 'Founder & Full-Stack Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'SiteCompiler',
    },
    sameAs: [
      'https://github.com/subhxroy',
      'https://twitter.com/subhroy',
    ],
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SiteCompiler Engine',
    operatingSystem: 'Web',
    applicationCategory: 'DeveloperApplication',
    description:
      'AI-powered website compilation platform that converts published Framer, Webflow, Wix, and static websites into clean React TSX, Next.js 15 App Router, and Tailwind CSS code.',
    url: SITE_URL,
    offers: [
      {
        '@type': 'Offer',
        name: 'Hobby Tier',
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        name: 'Pro Tier',
        price: '29',
        priceCurrency: 'USD',
      },
    ],
  };
}

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      ...items.map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 2,
        name: it.name,
        item: it.item.startsWith('http') ? it.item : `${SITE_URL}${it.item}`,
      })),
    ],
  };
}

export interface FaqPair {
  question: string;
  answer: string;
}

export function faqPageSchema(faqs: FaqPair[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  authorName?: string;
  imageUrl?: string;
}

export function articleSchema(post: ArticleInput) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: post.title,
    description: post.description,
    image: post.imageUrl ? (post.imageUrl.startsWith('http') ? post.imageUrl : `${SITE_URL}${post.imageUrl}`) : `${SITE_URL}/og?title=${encodeURIComponent(post.title)}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.authorName || 'Subhankar Roy',
      url: `${SITE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SiteCompiler',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
      },
    },
  };
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export function howToSchema(title: string, description: string, steps: HowToStep[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: description,
    step: steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name,
      itemListElement: [
        {
          '@type': 'HowToDirection',
          text: s.text,
        },
      ],
      ...(s.url && { url: s.url }),
      ...(s.image && { image: s.image }),
    })),
  };
}

export function productSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SiteCompiler Pro Exporter',
    image: `${SITE_URL}/og?title=SiteCompiler%20Pro`,
    description: 'Automated website compilation tool converting Framer & Webflow to clean Next.js 15 & React code.',
    brand: {
      '@type': 'Brand',
      name: 'SiteCompiler',
    },
    offers: {
      '@type': 'Offer',
      price: '29.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/pricing`,
    },
  };
}

export interface VideoInput {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl?: string;
  embedUrl?: string;
}

export function videoObjectSchema(video: VideoInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.contentUrl && { contentUrl: video.contentUrl }),
    ...(video.embedUrl && { embedUrl: video.embedUrl }),
  };
}

export interface ReviewItem {
  author: string;
  reviewBody: string;
  ratingValue: number;
}

export function reviewSchema(reviews: ReviewItem[]) {
  return reviews.map((r) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: 'SiteCompiler',
    },
    author: {
      '@type': 'Person',
      name: r.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.ratingValue,
      bestRating: '5',
    },
    reviewBody: r.reviewBody,
  }));
}
