import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Seo } from './Seo';

function cleanHead() {
  document.title = '';
  document.head
    .querySelectorAll(
      'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], #earnrader-jsonld',
    )
    .forEach((node) => node.remove());
}

describe('Seo', () => {
  afterEach(cleanHead);

  it('sets title, description, canonical and social tags per route', () => {
    render(<Seo route="/app/income" />);
    expect(document.title).toBe('Find income ideas — EarnRadar');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('ranked income opportunities'),
    );
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toBe(`${window.location.origin}/app/income`);
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'website',
    );
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${window.location.origin}/og.svg`,
    );
    expect(document.head.querySelector('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
  });

  it('emits WebApplication JSON-LD', () => {
    render(<Seo route="/" />);
    const script = document.head.querySelector('#earnrader-jsonld');
    expect(script?.textContent).toBeTruthy();
    const data = JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
    expect(data).toMatchObject({ '@type': 'WebApplication', name: 'EarnRadar' });
  });

  it('falls back to a not-found head for unknown routes', () => {
    render(<Seo route="*" path="/nope" />);
    expect(document.title).toBe('Page not found — EarnRadar');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      `${window.location.origin}/nope`,
    );
  });
});
