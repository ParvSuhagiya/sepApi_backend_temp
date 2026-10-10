import {
  Briefcase,
  ChevronDown,
  ClipboardList,
  Info,
  Laptop,
  PenLine,
  Printer,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { Opportunity } from '../../api/schemas';
import { CopyButton } from '../../components/ui/CopyButton';
import { ScoreRing } from '../../components/ui/ScoreBadge';
import { Tooltip } from '../../components/ui/Tooltip';
import { StarButton } from '../shortlist/shortlist';

export type OpportunityTypeLabel =
  | 'job'
  | 'freelance'
  | 'local business'
  | 'online selling'
  | 'content';

export const TYPE_META: Record<
  OpportunityTypeLabel,
  { label: string; icon: LucideIcon; color: string }
> = {
  job: {
    label: 'Job',
    icon: Briefcase,
    color:
      'bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30',
  },
  freelance: {
    label: 'Freelance',
    icon: Laptop,
    color:
      'bg-violet-500/10 text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-500/30',
  },
  'local business': {
    label: 'Local business',
    icon: Store,
    color:
      'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30',
  },
  'online selling': {
    label: 'Online selling',
    icon: ShoppingBag,
    color:
      'bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30',
  },
  content: {
    label: 'Content',
    icon: PenLine,
    color:
      'bg-pink-500/10 text-pink-600 border-pink-200 dark:text-pink-400 dark:border-pink-500/30',
  },
};

const SCORE_ROWS = [
  { key: 'demand', label: 'Demand', weight: 30, color: '#6366f1' },
  { key: 'fit', label: 'Fit', weight: 20, color: '#8b5cf6' },
  { key: 'trust', label: 'Trust', weight: 20, color: '#06b6d4' },
  { key: 'low_competition', label: 'Competition', weight: 15, color: '#10b981' },
  { key: 'cost_ease', label: 'Easy to start', weight: 15, color: '#f59e0b' },
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
    <div className="flex flex-col gap-3 rounded-2xl bg-surface/60 p-4 border border-line/50">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Score Breakdown</p>
      {SCORE_ROWS.map((row) => {
        const value = opportunity.score_breakdown[row.key] ?? 0;
        const max = row.weight;
        const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-ink">
                {row.label}
                <span className="ml-1 text-[10px] font-normal text-muted">/{row.weight}pt</span>
              </span>
              <span className="tabular-nums text-xs font-bold" style={{ color: row.color }}>
                {value.toFixed(1)}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.label}: ${value.toFixed(1)} of ${max}`}
              className="h-1.5 overflow-hidden rounded-full bg-line/60"
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        );
      })}
      <p className="mt-1 text-[10px] text-muted leading-relaxed border-t border-line/50 pt-2.5">
        EarnScore = 30% Demand + 20% Fit + 20% Trust + 15% Low competition + 15% Ease of start.
      </p>
      {opportunity.adjustments.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-line/50 pt-2.5">
          {opportunity.adjustments.map((note) => (
            <li key={note} className="flex items-start gap-2 text-xs text-ink">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccordionSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group/acc rounded-2xl border border-line/50 bg-surface/40 overflow-hidden"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none select-none items-center gap-2.5 px-4 py-3 transition-colors hover:bg-surface/70 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10">
          <Icon aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
        </span>
        <span className="flex-1 text-sm font-semibold text-ink">{title}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-muted transition-transform duration-300 group-open/acc:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4 pt-1 border-t border-line/40">{children}</div>
    </details>
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
    color: 'bg-surface text-muted border-line',
  };
  const TypeIcon = typeMeta.icon;
  const planText = opportunity.plan_7_days
    .map((step, index) => `Day ${index + 1}: ${step}`)
    .join('\n');

  return (
    <article
      aria-labelledby={`opportunity-${rank}-title`}
      className="group relative flex flex-col rounded-3xl border border-line/60 bg-raised/95 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 overflow-hidden"
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      {/* Header */}
      <div className="flex items-start gap-4 p-5 sm:p-6">
        {/* Rank badge + score ring */}
        <div className="relative shrink-0">
          <div className="absolute -top-1 -left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white shadow-md shadow-brand/40">
            {rank}
          </div>
          <ScoreRing score={opportunity.earn_score} label="EarnScore" />
        </div>

        {/* Title + badges */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h4
            id={`opportunity-${rank}-title`}
            className="break-words text-lg sm:text-xl font-bold text-ink leading-snug"
          >
            {opportunity.title}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.color}`}
            >
              <TypeIcon aria-hidden="true" className="h-3 w-3" />
              {typeMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
              <TrendingUp aria-hidden="true" className="h-3 w-3" />
              {opportunity.income_estimate}
              <Tooltip content="Not a promise. Based on collected market evidence.">
                <button
                  type="button"
                  aria-label="Why this is an estimate"
                  className="ml-0.5 inline-flex items-center text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Info aria-hidden="true" className="h-3 w-3" />
                </button>
              </Tooltip>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
          <StarButton
            item={{
              id: `opportunity:${opportunity.title}`,
              kind: 'opportunity',
              title: opportunity.title,
              subtitle: typeMeta.label,
              phone: null,
            }}
          />
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line/60 bg-surface/60 px-2 py-1 text-[11px] font-medium text-muted transition-all hover:border-brand/40 hover:text-ink hover:bg-brand/5">
            <input
              type="checkbox"
              checked={compareChecked}
              disabled={compareDisabled}
              onChange={(event) => onCompareChange(event.target.checked)}
              className="h-3.5 w-3.5 rounded accent-brand"
              aria-label={`Compare ${opportunity.title}`}
            />
            Compare
          </label>
        </div>
      </div>

      {/* Why insight */}
      <div className="mx-5 sm:mx-6 mb-4 rounded-2xl border border-brand/15 bg-gradient-to-r from-brand/5 via-brand/8 to-brand/5 p-3.5">
        <p className="flex items-start gap-2.5 text-sm text-ink leading-relaxed">
          <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
          <span>{opportunity.why}</span>
        </p>
      </div>

      {/* Evidence */}
      <div className="mx-5 sm:mx-6 mb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">Evidence</p>
        <ul className="flex flex-col gap-2">
          {opportunity.evidence.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
              <span className="leading-relaxed break-words">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Accordion sections */}
      <div className="flex flex-col gap-2 px-5 sm:px-6 pb-5">
        <AccordionSection icon={ClipboardList} title="7-day action plan">
          <div className="print-plan mt-3 flex flex-col gap-3">
            {opportunity.plan_7_days.map((step, index) => (
              <div key={`${index}-${step}`} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white shadow-sm shadow-brand/30">
                  {index + 1}
                </span>
                <p className="text-xs sm:text-sm text-ink leading-relaxed break-words pt-0.5">
                  {step}
                </p>
              </div>
            ))}
            <div className="mt-2 flex flex-wrap gap-2 print:hidden border-t border-line/50 pt-3">
              <CopyButton text={planText} label="7-day plan" />
              <button
                type="button"
                onClick={() => {
                  if (typeof window.print === 'function') window.print();
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-line/70 bg-raised px-3 text-xs font-semibold text-ink shadow-sm hover:bg-surface hover:border-brand/30 transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print plan</span>
              </button>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection icon={Info} title="How this score was built">
          <div className="mt-3">
            <ScoreBreakdown opportunity={opportunity} />
          </div>
        </AccordionSection>
      </div>
    </article>
  );
}
