import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { LeadsInput } from '../../api/client';
import type { LeadsResponse } from '../../api/schemas';
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
      className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4 shadow-sm"
    >
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] rounded-md px-3 text-sm font-semibold text-ink underline hover:bg-surface"
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
    <div className="flex flex-col gap-6">
      <section aria-labelledby="leads-summary-heading">
        <h3 id="leads-summary-heading" className="text-lg font-bold text-ink">
          What we understood
        </h3>
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-raised p-4 shadow-sm">
          <p className="break-words text-sm text-ink">{result.offer_summary}</p>
          {effectiveInput ? (
            <p className="text-sm text-muted">
              City: {effectiveInput.city} · Max leads: {effectiveInput.max_leads}
            </p>
          ) : null}
          <div>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              Edit and re-run
            </button>
          </div>
        </div>
      </section>
      <div>
        <p className="text-sm text-muted">
          {count === 1 ? '1 lead found.' : `${count} leads found.`}
        </p>
        <p className="mt-1 text-sm text-muted">
          {`SerpAPI credits used: ${result.meta.credits_used} · Served from cache: ${result.meta.cache_hits}`}
        </p>
      </div>
      <LeadsNotice meta={result.meta} />
      <p className="rounded-md border border-line bg-surface p-3 text-sm text-ink">
        {result.disclaimer || FALLBACK_DISCLAIMER}
      </p>
      <section aria-labelledby="leads-heading">
        <h3 id="leads-heading" className="text-lg font-bold text-ink">
          Ranked leads
        </h3>
        <div className="mt-3">
          {result.leads.length === 0 ? (
            <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">
              No customer leads found for this offer. Try a broader offer or a larger nearby city.
            </p>
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
      <section aria-labelledby="leads-map-heading">
        <h3 id="leads-map-heading" className="text-lg font-bold text-ink">
          Map
        </h3>
        <div className="mt-3">
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <LazyLeadsMap
              leads={result.leads}
              selectedId={selectedId}
              onSelect={setSelectedId}
              shortlistedIds={shortlistedIds}
            />
          </Suspense>
        </div>
      </section>
      <section aria-labelledby="market-notes-heading">
        <h3 id="market-notes-heading" className="text-lg font-bold text-ink">
          Competitor notes
        </h3>
        <div className="mt-3 rounded-lg border border-line bg-raised p-4 shadow-sm">
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
        className="text-xl font-bold text-ink"
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
