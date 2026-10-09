import { ExternalLink, Info, MapPin, Phone, Sparkles, Store } from 'lucide-react';
import type { Lead } from '../../api/schemas';
import { CopyButton } from '../../components/ui/CopyButton';
import { Disclosure } from '../../components/ui/Disclosure';
import { ScoreRing } from '../../components/ui/ScoreBadge';
import { LeadOutreach } from './LeadOutreach';
import { StarButton } from '../shortlist/shortlist';
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
    <div className="flex flex-col gap-3 rounded-2xl bg-surface/50 p-4 border border-line/60">
      {SCORE_ROWS.map((row) => {
        const value = lead.score_breakdown[row.key] ?? 0;
        const width = Math.max(0, Math.min(100, value));
        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span className="text-ink">
                {row.label} <span className="text-muted font-normal">· {row.weight}%</span>
              </span>
              <span className="tabular-nums text-brand font-bold">{value.toFixed(1)}</span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${value.toFixed(1)} of 100`}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface"
            >
              <div className="h-full rounded-full brand-gradient transition-all duration-500" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted leading-relaxed border-t border-line/60 pt-2">
        Final formula: Lead score = 40% Mid-level fit + 30% Pain signals + 15% Reachability + 15%
        No software yet. Scores are signals from public data, not guarantees.
      </p>
      {lead.adjustments.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-line/60 pt-2">
          {lead.adjustments.map((note) => (
            <li key={note} className="flex items-start gap-2 text-xs font-medium text-ink">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
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
      className={`group flex flex-col gap-4 rounded-3xl border bg-raised/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md ${
        highlighted ? 'border-brand-strong ring-2 ring-brand-strong' : 'border-line/80'
      }`}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={lead.match_score} label="Lead score" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">#{rank}</p>
          <h4
            id={`lead-${rank}-title`}
            className="mt-1 break-words text-lg sm:text-xl font-bold text-ink flex items-center gap-2"
          >
            <Store className="h-4 w-4 text-brand shrink-0" />
            <span>{lead.name}</span>
          </h4>
          <p className="mt-1 break-words text-xs sm:text-sm text-muted">
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

      <div className="flex flex-wrap gap-2">
        {lead.likely_has_software ? (
          <span className="rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-semibold text-ink">
            May already use billing software
          </span>
        ) : null}
        {lead.research === 'partial' ? (
          <span className="rounded-full border border-tone-amber-border/40 bg-tone-amber-bg px-3 py-1 text-xs font-semibold text-tone-amber-fg shadow-sm">
            Research partial
          </span>
        ) : null}
      </div>

      {lead.why_fit ? (
        <div className="rounded-2xl bg-surface/50 p-4 border border-line/60">
          <p className="text-xs sm:text-sm font-medium text-ink leading-relaxed flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <span>{lead.why_fit}</span>
          </p>
        </div>
      ) : null}

      {lead.match_reasons.length > 0 ? (
        <div>
          <ul aria-label="Why this matches" className="flex list-disc flex-col gap-1 pl-5 text-xs sm:text-sm text-ink">
            {lead.match_reasons.map((reason) => (
              <li key={reason} className="break-words">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snippets.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-ink">From public reviews</p>
          <div className="mt-1.5 flex flex-col gap-2">
            {snippets.map((snippet) => (
              <blockquote
                key={snippet}
                className="break-words rounded-2xl border-l-4 border-brand bg-surface/70 px-4 py-2.5 text-xs sm:text-sm text-ink leading-relaxed shadow-sm"
              >
                “{snippet}”
              </blockquote>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm border-t border-line/60 pt-3">
        {lead.phone ? (
          <a
            href={`tel:${phoneDigits}`}
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{lead.phone}</span>
          </a>
        ) : null}
        {lead.website ? (
          <a
            href={lead.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Business website</span>
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : null}
        {lead.maps_url ? (
          <a
            href={lead.maps_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>View on Google Maps</span>
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : null}
      </div>

      {lead.pitch_angle ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface/50 p-3 border border-line/60">
          <p className="min-w-0 flex-1 break-words text-xs sm:text-sm text-ink">
            <span className="font-semibold">Pitch: </span>
            {lead.pitch_angle}
          </p>
          <CopyButton text={lead.pitch_angle} label="pitch angle" />
        </div>
      ) : null}

      {lead.suggested_first_question ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface/50 p-3 border border-line/60">
          <p className="min-w-0 flex-1 break-words text-xs sm:text-sm text-ink">
            <span className="font-semibold">First question: </span>
            {lead.suggested_first_question}
          </p>
          <CopyButton text={lead.suggested_first_question} label="first question" />
        </div>
      ) : null}

      <div className="border-t border-line/60 pt-3">
        <Disclosure summary="How this score was built">
          <div className="mt-2">
            <ScoreBreakdown lead={lead} />
          </div>
        </Disclosure>
      </div>

      <div className="border-t border-line/60 pt-3">
        <LeadOutreach lead={lead} offerText={offerText} city={city} productSummary={productSummary} />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-line/60 pt-3">
        <StarButton
          item={{
            id: `lead:${lead.name}`,
            kind: 'lead',
            title: lead.name,
            subtitle: [lead.business_type, lead.address].filter(Boolean).join(' · '),
            phone: lead.phone ?? null,
          }}
        />
        <button
          type="button"
          aria-pressed={highlighted}
          onClick={onSelect}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all ${
            highlighted
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-line/80 bg-raised text-ink hover:bg-surface'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{highlighted ? 'Showing on map' : 'Show on map'}</span>
        </button>
      </div>
    </article>
  );
}
