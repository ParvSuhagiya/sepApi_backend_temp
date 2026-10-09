import { useEffect, useRef, useState } from 'react';
import type { SearchResponse } from '../../api/schemas';
import { useSearchSession } from './session';
import { EfficiencyStrip } from './EfficiencyStrip';
import { OpportunityList } from './OpportunityList';
import { ResultNotice } from './ResultNotice';

export const RESULT_SECTIONS = [
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'map', label: 'Map' },
  { id: 'local', label: 'Local' },
  { id: 'trends', label: 'Trends' },
  { id: 'forum', label: 'Forum' },
] as const;

function useActiveSection(ids: ReadonlyArray<string>): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  } else {
    window.location.hash = id;
  }
}

/** Sticky in-page navigation with scroll-spy; horizontal chips on small screens. */
export function ResultsNav() {
  const active = useActiveSection(RESULT_SECTIONS.map((section) => section.id));
  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-10 -mx-1 bg-surface/95 py-2 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {RESULT_SECTIONS.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollToId(section.id);
              }}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold ${
                active === section.id
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line bg-raised text-ink hover:bg-surface'
              }`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Full results layout. Section bodies arrive in steps 2.3–2.5. */
export function SearchResultsView({ result }: { result: SearchResponse }) {
  const count = result.opportunities.length;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">{count === 1 ? '1 idea found.' : `${count} ideas found.`}</p>
        <EfficiencyStrip
          creditsUsed={result.stats.credits_used}
          cacheHits={result.stats.cache_hits}
          durationMs={result.meta.duration_ms}
        />
      </div>
      <ResultNotice
        key={result.meta.request_id}
        degraded={result.meta.degraded}
        partial={result.meta.partial}
        notes={result.meta.notes}
      />
      <ResultsNav />
      <section id="opportunities" aria-labelledby="opportunities-heading">
        <h3 id="opportunities-heading" className="text-lg font-bold text-ink">
          Top opportunities
        </h3>
        <div className="mt-3">
          <OpportunityList opportunities={result.opportunities} />
        </div>
      </section>
      <section id="jobs" aria-labelledby="jobs-heading">
        <h3 id="jobs-heading" className="text-lg font-bold text-ink">
          Live jobs
        </h3>
      </section>
      <section id="map" aria-labelledby="map-heading">
        <h3 id="map-heading" className="text-lg font-bold text-ink">
          Map
        </h3>
      </section>
      <section id="local" aria-labelledby="local-heading">
        <h3 id="local-heading" className="text-lg font-bold text-ink">
          Nearby businesses
        </h3>
      </section>
      <section id="trends" aria-labelledby="trends-heading">
        <h3 id="trends-heading" className="text-lg font-bold text-ink">
          Demand trends
        </h3>
      </section>
      <section id="forum" aria-labelledby="forum-heading">
        <h3 id="forum-heading" className="text-lg font-bold text-ink">
          Forum discussions
        </h3>
      </section>
    </div>
  );
}

/** Session-connected results: scrolls to and focuses the heading on success. */
export function SearchResults() {
  const { result } = useSearchSession();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    headingRef.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  if (!result) return null;
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-4">
      <h2 id="results-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink">
        Your income opportunities
      </h2>
      <SearchResultsView result={result} />
    </section>
  );
}
