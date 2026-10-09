import { useEffect } from 'react';

export type SeoRoute =
  | '/'
  | '/app/income'
  | '/app/customers'
  | '/how-it-works'
  | '/privacy'
  | '/terms'
  | '/responsible-use'
  | '*';

const META: Record<SeoRoute, { title: string; description: string }> = {
  '/': {
    title: 'EarnRadar — Income ideas & customer finder for India',
    description:
      'Realistic income ideas with honest EarnScore transparency, plus a customer finder for local businesses.',
  },
  '/app/income': {
    title: 'Find income ideas — EarnRadar',
    description:
      'Turn your skills and city into ranked income opportunities with EarnScore, Scam Shield and 7-day plans.',
  },
  '/app/customers': {
    title: 'Find customers for my product — EarnRadar',
    description:
      'Turn your product into ranked local-business leads with review pain signals and human-reviewed outreach drafts.',
  },
  '/how-it-works': {
    title: 'How EarnRadar works — EarnRadar',
    description:
      'Data sources, EarnScore weights, Scam Shield limits, caching and credits, explained plainly.',
  },
  '/privacy': {
    title: 'Privacy — EarnRadar',
    description: 'Exactly what EarnRadar stores: your theme choice, and nothing else.',
  },
  '/terms': {
    title: 'Terms — EarnRadar',
    description: 'Estimates not promises, verification duties and fair use.',
  },
  '/responsible-use': {
    title: 'Responsible use — EarnRadar',
    description: 'Outreach etiquette, employer verification and DPDP awareness.',
  },
  '*': {
    title: 'Page not found — EarnRadar',
    description: 'The page you asked for does not exist.',
  },
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setJsonLd(origin: string) {
  const ID = 'earnrader-jsonld';
  let script = document.head.querySelector<HTMLScriptElement>(`#${ID}`);
  if (!script) {
    script = document.createElement('script');
    script.id = ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EarnRadar',
    url: `${origin}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: META['/'].description,
  });
}

/**
 * Per-route document head: title, description, canonical, OG/Twitter tags
 * and WebApplication JSON-LD. Canonical and images derive from the runtime
 * origin so every deployment is correct without configuration.
 */
export function Seo({ route, path }: { route: SeoRoute; path?: string }) {
  useEffect(() => {
    const meta = META[route];
    const origin = window.location.origin;
    const url = `${origin}${path ?? route}`;
    const image = `${origin}/og.svg`;
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setCanonical(url);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', image);
    setJsonLd(origin);
  }, [route, path]);
  return null;
}
