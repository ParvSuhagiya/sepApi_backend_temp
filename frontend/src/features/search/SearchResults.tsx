import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Briefcase, LineChart, MapPin, MessageSquare, Sparkles, Store } from 'lucide-react';
import type { SearchInput } from '../../api/client';
import type { SearchResponse } from '../../api/schemas';
import { useOptionalSearchSession, useSearchSession } from './session';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { EfficiencyStrip } from './EfficiencyStrip';
import { ForumCard } from './ForumCard';
import { JobList } from './JobList';
import { LocalList } from './LocalCard';
import { OpportunityList } from './OpportunityList';
import { ResultNotice } from './ResultNotice';
import { Skeleton } from '../../components/ui/feedback';

export const RESULT_SECTIONS = [
  { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'map', label: 'Map', icon: MapPin },
  { id: 'local', label: 'Local', icon: Store },
  { id: 'trends', label: 'Trends', icon: LineChart },
  { id: 'forum', label: 'Forum', icon: MessageSquare },
] as const;

// Lazy map + chart chunks (Leaflet, clustering and Recharts stay out of the
// landing bundle).
const LazyJobsMap = lazy(() =>
  import('../map/JobsMap').then((module) => ({ default: module.JobsMap })),
);
const LazyTrendChart = lazy(() =>
  import('./TrendChart').then((module) => ({ default: module.TrendChart })),
);

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
      className="sticky top-14 z-20 -mx-1 min-w-0 bg-surface/90 py-2.5 backdrop-blur-xl transition-colors"
    >
      <ul className="flex max-w-full gap-2 overflow-x-auto pb-1 px-1">
        {RESULT_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isSelected = active === section.id;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={isSelected ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToId(section.id);
                }}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all duration-150 ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-md shadow-indigo-500/20'
                    : 'border-line/80 bg-raised text-muted hover:text-ink hover:bg-surface'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Full results layout. */
export function SearchResultsView({
  result,
  profile,
}: {
  result: SearchResponse;
  profile?: SearchInput | null;
}) {
  const count = result.opportunities.length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const session = useOptionalSearchSession();
  const effectiveProfile = profile !== undefined ? profile : (session?.profile ?? null);
  return (
    <div className="flex flex-col gap-6 animate-reveal">
      <div className="rounded-3xl border border-line/80 bg-raised/80 p-5 shadow-sm backdrop-blur-xl">
        <p className="text-sm text-muted">{count === 1 ? '1 idea found.' : `${count} ideas found.`}</p>
        <div className="mt-2">
          <EfficiencyStrip
            creditsUsed={result.stats.credits_used}
            cacheHits={result.stats.cache_hits}
            durationMs={result.meta.duration_ms}
          />
        </div>
      </div>

      <ResultNotice
        key={result.meta.request_id}
        degraded={result.meta.degraded}
        partial={result.meta.partial}
        notes={result.meta.notes}
      />
      <ResultsNav />
      <section id="opportunities" aria-labelledby="opportunities-heading">
        <h3 id="opportunities-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <span>Top opportunities</span>
        </h3>
        <div className="mt-4">
          <OpportunityList opportunities={result.opportunities} />
        </div>
      </section>
      <section id="jobs" aria-labelledby="jobs-heading">
        <h3 id="jobs-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-brand" />
          <span>Live jobs</span>
        </h3>
        <div className="mt-4">
          <JobList jobs={result.jobs} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </section>
      <section id="map" aria-labelledby="map-heading">
        <h3 id="map-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand" />
          <span>Interactive Map</span>
        </h3>
        <div className="mt-4 rounded-3xl overflow-hidden border border-line/80 shadow-md">
          <ErrorBoundary
            compact
            title="Map failed to load"
            message="The jobs and businesses above are unaffected. Try the list views instead."
          >
            <Suspense fallback={<Skeleton className="h-80 w-full" />}>
              <LazyJobsMap
                jobs={result.jobs}
                places={result.local}
                cityCenter={result.meta.city_center}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>
      <section id="local" aria-labelledby="local-heading">
        <h3 id="local-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Store className="h-5 w-5 text-brand" />
          <span>Nearby businesses</span>
        </h3>
        <div className="mt-4">
          <LocalList places={result.local} profile={effectiveProfile} />
        </div>
      </section>
      <section id="trends" aria-labelledby="trends-heading">
        <h3 id="trends-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <LineChart className="h-5 w-5 text-brand" />
          <span>Demand trends</span>
        </h3>
        <div className="mt-4 rounded-3xl border border-line/80 bg-raised/90 p-5 shadow-sm">
          <ErrorBoundary
            compact
            title="Trend chart failed to load"
            message="The opportunities above are unaffected."
          >
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <LazyTrendChart
                keyword={result.trend_keyword}
                growth={result.trend_growth}
                points={result.trend}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>
      <section id="forum" aria-labelledby="forum-heading">
        <h3 id="forum-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand" />
          <span>Forum discussions</span>
        </h3>
        <div className="mt-4 flex flex-col gap-4">
          {result.forum.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/80 bg-surface/40 p-6 text-center text-sm text-muted">
              No forum discussions found for this search.
            </div>
          ) : (
            result.forum.map((item) => <ForumCard key={item.link} item={item} />)
          )}
        </div>
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
      <h2 id="results-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-ink tracking-tight">
        Your income opportunities
      </h2>
      <SearchResultsView result={result} />
    </section>
  );
}
