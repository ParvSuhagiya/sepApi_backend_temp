import {
  Briefcase,
  Info,
  Laptop,
  PenLine,
  ShoppingBag,
  Store,
  type LucideIcon,
} from 'lucide-react';
import type { Opportunity } from '../../api/schemas';
import { CopyButton } from '../../components/ui/CopyButton';
import { Disclosure } from '../../components/ui/Disclosure';
import { ScoreRing } from '../../components/ui/ScoreBadge';
import { Tooltip } from '../../components/ui/Tooltip';
import { StarButton } from '../shortlist/shortlist';

export type OpportunityTypeLabel =
  | 'job'
  | 'freelance'
  | 'local business'
  | 'online selling'
  | 'content';

export const TYPE_META: Record<OpportunityTypeLabel, { label: string; icon: LucideIcon }> = {
  job: { label: 'Job', icon: Briefcase },
  freelance: { label: 'Freelance', icon: Laptop },
  'local business': { label: 'Local business', icon: Store },
  'online selling': { label: 'Online selling', icon: ShoppingBag },
  content: { label: 'Content', icon: PenLine },
};

const SCORE_ROWS = [
  { key: 'demand', label: 'Demand', weight: 30 },
  { key: 'fit', label: 'Fit', weight: 20 },
  { key: 'trust', label: 'Trust', weight: 20 },
  { key: 'low_competition', label: 'Low competition', weight: 15 },
  { key: 'cost_ease', label: 'Easy to start', weight: 15 },
] as const;

export interface OpportunityCardProps {
  rank: number;
  opportunity: Opportunity;
  compareChecked: boolean;
  compareDisabled: boolean;
  onCompareChange: (checked: boolean) => void;
}

function ScoreBreakdown({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="flex flex-col gap-2">
      {SCORE_ROWS.map((row) => {
        const value = opportunity.score_breakdown[row.key] ?? 0;
        const max = row.weight;
        const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
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
              aria-label={`${row.label}: ${value.toFixed(1)} of ${max} weighted points`}
              className="mt-1 h-2 overflow-hidden rounded-full bg-surface"
            >
              <div className="h-full rounded-full bg-brand-strong" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Final formula: EarnScore = 30% Demand + 20% Fit + 20% Trust + 15% Low competition + 15%
        Easy to start. Bars show each weighted contribution; they sum to the EarnScore.
      </p>
      {opportunity.adjustments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {opportunity.adjustments.map((note) => (
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

/** One ranked opportunity: score, evidence, plan, and score transparency. */
export function OpportunityCard({
  rank,
  opportunity,
  compareChecked,
  compareDisabled,
  onCompareChange,
}: OpportunityCardProps) {
  const typeMeta = TYPE_META[opportunity.type as OpportunityTypeLabel] ?? {
    label: opportunity.type,
    icon: Briefcase,
  };
  const TypeIcon = typeMeta.icon;
  const planText = opportunity.plan_7_days
    .map((step, index) => `Day ${index + 1}: ${step}`)
    .join('\n');

  return (
    <article
      aria-labelledby={`opportunity-${rank}-title`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ScoreRing score={opportunity.earn_score} label="EarnScore" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">#{rank}</p>
          <h4 id={`opportunity-${rank}-title`} className="break-words text-lg font-bold text-ink">
            {opportunity.title}
          </h4>
          <p className="mt-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
              <TypeIcon aria-hidden="true" className="h-3.5 w-3.5" />
              {typeMeta.label}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StarButton
            item={{
              id: `opportunity:${opportunity.title}`,
              kind: 'opportunity',
              title: opportunity.title,
              subtitle: typeMeta.label,
              phone: null,
            }}
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted">
            <input
              type="checkbox"
              checked={compareChecked}
              disabled={compareDisabled}
              onChange={(event) => onCompareChange(event.target.checked)}
              className="h-[22px] w-[22px] accent-brand"
              aria-label={`Compare ${opportunity.title}`}
            />
            Compare
          </label>
        </div>
      </div>

      <p className="text-sm text-ink">{opportunity.why}</p>

      <p className="text-sm text-ink">
        <span className="font-semibold">Income: {opportunity.income_estimate}</span>{' '}
        <span className="rounded-sm bg-surface px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
          Estimate
        </span>{' '}
        <Tooltip content="Not a promise. Based on collected evidence.">
          <button
            type="button"
            aria-label="Why this is an estimate"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md align-middle text-muted hover:text-ink"
          >
            <Info aria-hidden="true" className="h-4 w-4" />
          </button>
        </Tooltip>
      </p>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        {opportunity.evidence.map((line) => (
          <li key={line} className="break-words">
            {line}
          </li>
        ))}
      </ul>

      <Disclosure summary="7-day plan">
        <div className="print-plan">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink">
            {opportunity.plan_7_days.map((step, index) => (
              <li key={`${index}-${step}`} className="break-words">
                <span className="font-semibold">Day {index + 1}:</span> {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <CopyButton text={planText} label="7-day plan" />
            <button
              type="button"
              onClick={() => {
                if (typeof window.print === 'function') window.print();
              }}
              className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
            >
              Print plan
            </button>
          </div>
        </div>
      </Disclosure>

      <Disclosure summary="How this score was built">
        <ScoreBreakdown opportunity={opportunity} />
      </Disclosure>
    </article>
  );
}
