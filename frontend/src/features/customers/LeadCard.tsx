import { Info } from 'lucide-react';
import type { Lead } from '../../api/schemas';
import { CopyButton } from '../../components/ui/CopyButton';
import { Disclosure } from '../../components/ui/Disclosure';
import { ScoreRing } from '../../components/ui/ScoreBadge';
import { LeadOutreach } from './LeadOutreach';
import { LEAD_SCORE_WEIGHTS, splitSnippets } from './leadUtils';

const SCORE_ROWS = [
  { key: 'mid_level', label: 'Mid-level fit', weight: LEAD_SCORE_WEIGHTS.mid_level },
  { key: 'pain', label: 'Pain signals', weight: LEAD_SCORE_WEIGHTS.pain },
  { key: 'reachability', label: 'Reachability', weight: LEAD_SCORE_WEIGHTS.reachability },
  { key: 'no_software', label: 'No software yet', weight: LEAD_SCORE_WEIGHTS.no_software },
] as const;

export interface LeadCardProps {
  rank: number;
  lead: Lead;
  offerText: string;
  city: string;
  productSummary: string;
  highlighted: boolean;
  onSelect: () => void;
}

function ratingLine(lead: Lead): string {
  if (lead.rating == null) return 'Not rated yet';
  if (lead.user_ratings_total == null) return `Rated ${lead.rating} on Google Maps`;
  return `Rated ${lead.rating} from ${lead.user_ratings_total} reviews`;
}

function ScoreBreakdown({ lead }: { lead: Lead }) {
  return (
    <div className="flex flex-col gap-2">
      {SCORE_ROWS.map((row) => {
        const value = lead.score_breakdown[row.key] ?? 0;
        const width = Math.max(0, Math.min(100, value));
        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-ink">
                {row.label} <span className="text-muted">· {row.weight}%</span>
              </span>
              <span className="tabular-nums text-ink">{value.toFixed(1)}</span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${value.toFixed(1)} of 100`}
              className="mt-1 h-2 overflow-hidden rounded-full bg-surface"
            >
              <div className="h-full rounded-full bg-brand-strong" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Final formula: Lead score = 40% Mid-level fit + 30% Pain signals + 15% Reachability + 15%
        No software yet. Scores are signals from public data, not guarantees.
      </p>
      {lead.adjustments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {lead.adjustments.map((note) => (
            <li key={note} className="flex items-start gap-1.5 text-sm text-ink">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One ranked customer lead: score, fit, review evidence, contacts, outreach. */
export function LeadCard({
  rank,
  lead,
  offerText,
  city,
  productSummary,
  highlighted,
  onSelect,
}: LeadCardProps) {
  const snippets = splitSnippets(lead);
  const phoneDigits = lead.phone ? lead.phone.replace(/\D/g, '') : '';

  return (
    <article
      aria-labelledby={`lead-${rank}-title`}
      className={`flex flex-col gap-3 rounded-lg border bg-raised p-4 shadow-sm ${
        highlighted ? 'border-brand-strong ring-2 ring-brand-strong' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={lead.match_score} label="Lead score" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">#{rank}</p>
          <h4 id={`lead-${rank}-title`} className="break-words text-lg font-bold text-ink">
            {lead.name}
          </h4>
          <p className="mt-1 break-words text-sm text-muted">
            {[lead.business_type, lead.address].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 text-sm text-ink">{ratingLine(lead)}</p>
          {lead.price_level != null ? (
            <p className="mt-1 text-sm text-ink">
              Price level {'₹'.repeat(lead.price_level)}{' '}
              <span className="text-muted">({lead.price_level} of 4)</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {lead.likely_has_software ? (
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
            May already use billing software
          </span>
        ) : null}
        {lead.research === 'partial' ? (
          <span className="rounded-full border border-tone-amber-border bg-tone-amber-bg px-2.5 py-0.5 text-xs font-semibold text-tone-amber-fg">
            Research partial
          </span>
        ) : null}
      </div>

      {lead.why_fit ? <p className="text-sm text-ink">{lead.why_fit}</p> : null}

      {lead.match_reasons.length > 0 ? (
        <ul aria-label="Why this matches" className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
          {lead.match_reasons.map((reason) => (
            <li key={reason} className="break-words">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      {snippets.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-ink">From public reviews</p>
          <div className="mt-1 flex flex-col gap-2">
            {snippets.map((snippet) => (
              <blockquote
                key={snippet}
                className="break-words rounded-md border-l-4 border-line bg-surface px-3 py-2 text-sm text-ink"
              >
                “{snippet}”
              </blockquote>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 text-sm">
        {lead.phone ? (
          <p>
            <a href={`tel:${phoneDigits}`} className="font-semibold text-brand underline">
              {lead.phone}
            </a>
          </p>
        ) : null}
        {lead.website ? (
          <p className="break-words">
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand underline"
            >
              Business website<span className="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        ) : null}
        {lead.maps_url ? (
          <p>
            <a
              href={lead.maps_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand underline"
            >
              View on Google Maps<span className="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        ) : null}
      </div>

      {lead.pitch_angle ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 break-words text-sm text-ink">
            <span className="font-semibold">Pitch: </span>
            {lead.pitch_angle}
          </p>
          <CopyButton text={lead.pitch_angle} label="pitch angle" />
        </div>
      ) : null}
      {lead.suggested_first_question ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 break-words text-sm text-ink">
            <span className="font-semibold">First question: </span>
            {lead.suggested_first_question}
          </p>
          <CopyButton text={lead.suggested_first_question} label="first question" />
        </div>
      ) : null}

      <Disclosure summary="How this score was built">
        <ScoreBreakdown lead={lead} />
      </Disclosure>

      <LeadOutreach lead={lead} offerText={offerText} city={city} productSummary={productSummary} />

      <div>
        <button
          type="button"
          aria-pressed={highlighted}
          onClick={onSelect}
          className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
        >
          {highlighted ? 'Showing on map' : 'Show on map'}
        </button>
      </div>
    </article>
  );
}
