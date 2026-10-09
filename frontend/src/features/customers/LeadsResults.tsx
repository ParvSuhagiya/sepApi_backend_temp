import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Info, MapPin, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { LeadsInput } from '../../api/client';
import type { LeadsResponse } from '../../api/schemas';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Skeleton } from '../../components/ui/feedback';
import { useOptionalShortlist } from '../shortlist/shortlist';
import { LeadCard } from './LeadCard';
import { MarketNotes } from './MarketNotes';
import { leadShortlistIds } from './leadPins';
import { useOptionalLeadsSession } from './session';

const LazyLeadsMap = lazy(() =>
  import('./LeadsMap').then((module) => ({ default: module.LeadsMap })),
);

const FALLBACK_DISCLAIMER =
  'Lead scores are signals from public data, not guarantees. Verify details before contacting.';

const FRIENDLY_NOTES: Record<string, string> = {
  deadline_reached: 'The search hit its time limit, showing the finished work.',
  ai_text_fallback: 'Some explanations use fallback text because AI text was unavailable.',
  research_capped: 'Review research was capped, so some leads use listing data only.',
  market_unavailable: 'Competitor research was unavailable for this search.',
  day_budget_exhausted: 'The daily search budget was exhausted; results use cached data.',
  response_cache_hit: 'Served from the response cache.',
  no_matching_businesses: 'No matching businesses were found for this offer.',
};

/** Dismissible banner for leads degradation notes. */
export function LeadsNotice({ meta }: { meta: LeadsResponse['meta'] }) {
  const [dismissed, setDismissed] = useState(false);
  const lines: string[] = [];
  if (meta.degraded.length > 0) {
    lines.push(`Some sources were unavailable: ${meta.degraded.join(', ')}.`);
  }
  if (meta.partial.length > 0) {
    lines.push(`Partial data from: ${meta.partial.join(', ')}.`);
  }
  for (const note of meta.notes) {
    lines.push(FRIENDLY_NOTES[note] ?? note);
  }
  if (dismissed || lines.length === 0) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-2xl border border-tone-amber-border/40 bg-tone-amber-bg/15 p-4 shadow-sm backdrop-blur-md"
    >
      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs sm:text-sm text-ink font-medium">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-bold text-brand hover:underline"
        >
          Dismiss notice
        </button>
      </div>
    </div>
  );
}

/** Full customer-leads layout: summary, disclaimer, leads, map, market notes. */
export function LeadsResultsView({
  result,
  input,
  onEdit,
}: {
  result: LeadsResponse;
  input: LeadsInput | null;
  onEdit: () => void;
}) {
  const session = useOptionalLeadsSession();
  const shortlist = useOptionalShortlist();
  const effectiveInput = input ?? session?.input ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shortlistedIds = useMemo(() => {
    const titles = new Set(
      (shortlist?.items ?? []).filter((item) => item.kind === 'lead').map((item) => item.title),
    );
    return leadShortlistIds(result.leads, titles);
  }, [shortlist, result.leads]);
  const productSummary = result.offer_summary.trim().slice(0, 200);
  const count = result.leads.length;

  return (
    <div className="flex flex-col gap-6 animate-reveal">
      <section aria-labelledby="leads-summary-heading">
        <div className="rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="leads-summary-heading" className="text-base font-bold text-ink flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <span>What we understood</span>
              </h3>
              <p className="mt-2 break-words text-sm text-ink leading-relaxed font-medium">
                {result.offer_summary}
              </p>
              {effectiveInput ? (
                <p className="mt-2 text-xs font-semibold text-muted">
                  City: {effectiveInput.city} · Max leads requested: {effectiveInput.max_leads}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line/80 bg-surface px-3.5 text-xs font-bold text-ink shadow-sm hover:bg-raised transition-all shrink-0"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand" />
              <span>Edit and re-run</span>
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-bold text-ink flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <span>{count === 1 ? '1 lead found.' : `${count} customer leads ranked.`}</span>
        </p>
        <p className="text-xs text-muted">
          {`SerpAPI credits used: ${result.meta.credits_used} · Cache hits: ${result.meta.cache_hits}`}
        </p>
      </div>

      <LeadsNotice meta={result.meta} />

      <p className="flex items-start gap-2 rounded-2xl border border-line/80 bg-surface/80 p-4 text-xs sm:text-sm text-muted">
        <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
        <span>{result.disclaimer || FALLBACK_DISCLAIMER}</span>
      </p>

      <section aria-labelledby="leads-heading">
        <h3 id="leads-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Users className="h-5 w-5 text-brand" />
          <span>Ranked customer leads</span>
        </h3>
        <div className="mt-4">
          {result.leads.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line/80 bg-surface/40 p-8 text-center text-sm text-muted">
              No customer leads found for this offer. Try a broader offer description or a larger nearby city.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {result.leads.map((lead, index) => (
                <LeadCard
                  key={`${lead.name}|${index}`}
                  rank={index + 1}
                  lead={lead}
                  offerText={effectiveInput?.offer ?? ''}
                  city={effectiveInput?.city ?? ''}
                  productSummary={productSummary}
                  highlighted={selectedId === `lead-${index}`}
                  onSelect={() => setSelectedId(`lead-${index}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="leads-map" aria-labelledby="leads-map-heading">
        <h3 id="leads-map-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand" />
          <span>Leads Map</span>
        </h3>
        <div className="mt-4 rounded-3xl overflow-hidden border border-line/80 shadow-md">
          <ErrorBoundary
            compact
            title="Map failed to load"
            message="The ranked leads above are unaffected."
          >
            <Suspense fallback={<Skeleton className="h-80 w-full" />}>
              <LazyLeadsMap
                leads={result.leads}
                selectedId={selectedId}
                onSelect={setSelectedId}
                shortlistedIds={shortlistedIds}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>

      <section aria-labelledby="market-notes-heading">
        <h3 id="market-notes-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand" />
          <span>Competitor & Market intelligence</span>
        </h3>
        <div className="mt-4 rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-sm">
          <MarketNotes notes={result.market_notes} />
        </div>
      </section>
    </div>
  );
}

/** Session-connected leads results: scrolls to and focuses the heading. */
export function LeadsResults({ onEdit }: { onEdit: () => void }) {
  const { result, input } = useLeadsSessionStrict();
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
    <section aria-labelledby="leads-results-heading" className="flex flex-col gap-4">
      <h2
        id="leads-results-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-extrabold text-ink tracking-tight"
      >
        Your customer leads
      </h2>
      <LeadsResultsView result={result} input={input} onEdit={onEdit} />
    </section>
  );
}

function useLeadsSessionStrict() {
  const session = useOptionalLeadsSession();
  if (!session) throw new Error('LeadsResults must be used inside LeadsSessionProvider');
  return session;
}
