import {
  Briefcase,
  Info,
  Laptop,
  PenLine,
  Printer,
  ShoppingBag,
  Sparkles,
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
    <div className="flex flex-col gap-3 rounded-2xl bg-surface/50 p-4 border border-line/60">
      {SCORE_ROWS.map((row) => {
        const value = opportunity.score_breakdown[row.key] ?? 0;
        const max = row.weight;
        const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
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
              aria-label={`${row.label}: ${value.toFixed(1)} of ${max} weighted points`}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface"
            >
              <div className="h-full rounded-full brand-gradient transition-all duration-500" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted leading-relaxed border-t border-line/60 pt-2">
        Final formula: EarnScore = 30% Demand + 20% Fit + 20% Trust + 15% Low competition + 15%
        Easy to start. Bars show each weighted contribution; they sum to the EarnScore.
      </p>
      {opportunity.adjustments.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-line/60 pt-2">
          {opportunity.adjustments.map((note) => (
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
      className="group flex flex-col gap-4 rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={opportunity.earn_score} label="EarnScore" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">#{rank}</p>
          <h4 id={`opportunity-${rank}-title`} className="mt-1 break-words text-lg sm:text-xl font-bold text-ink">
            {opportunity.title}
          </h4>
          <p className="mt-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/80 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
              <TypeIcon aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
              {typeMeta.label}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <StarButton
            item={{
              id: `opportunity:${opportunity.title}`,
              kind: 'opportunity',
              title: opportunity.title,
              subtitle: typeMeta.label,
              phone: null,
            }}
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
            <input
              type="checkbox"
              checked={compareChecked}
              disabled={compareDisabled}
              onChange={(event) => onCompareChange(event.target.checked)}
              className="h-4 w-4 rounded accent-brand"
              aria-label={`Compare ${opportunity.title}`}
            />
            Compare
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-surface/50 p-4 border border-line/60">
        <p className="text-sm font-medium text-ink leading-relaxed flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <span>{opportunity.why}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
        <span className="font-bold text-indigo-600 dark:text-indigo-400">
          Income: {opportunity.income_estimate}
        </span>
        <span className="rounded-full border border-line/80 bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">
          Estimate
        </span>
        <Tooltip content="Not a promise. Based on collected evidence.">
          <button
            type="button"
            aria-label="Why this is an estimate"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink transition-colors"
          >
            <Info aria-hidden="true" className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
          {opportunity.evidence.map((line) => (
            <li key={line} className="break-words text-xs sm:text-sm">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line/60 pt-3 flex flex-col gap-2">
        <Disclosure summary="7-day plan">
          <div className="print-plan mt-2 rounded-2xl border border-line/70 bg-surface/40 p-4">
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-xs sm:text-sm text-ink">
              {opportunity.plan_7_days.map((step, index) => (
                <li key={`${index}-${step}`} className="break-words leading-relaxed">
                  <span className="font-semibold">Day {index + 1}:</span> {step}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2 print:hidden border-t border-line/60 pt-3">
              <CopyButton text={planText} label="7-day plan" />
              <button
                type="button"
                onClick={() => {
                  if (typeof window.print === 'function') window.print();
                }}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-line/80 bg-raised px-3.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print plan</span>
              </button>
            </div>
          </div>
        </Disclosure>

        <Disclosure summary="How this score was built">
          <div className="mt-2">
            <ScoreBreakdown opportunity={opportunity} />
          </div>
        </Disclosure>
      </div>
    </article>
  );
}
