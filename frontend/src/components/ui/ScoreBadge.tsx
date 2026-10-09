import { CircleAlert, CircleCheck, CircleX, type LucideIcon } from 'lucide-react';
import type { ScoreTone } from '../../lib/score';
import { scoreColor } from '../../lib/score';

const TONE_STYLES: Record<ScoreTone, string> = {
  green: 'bg-tone-green-bg text-tone-green-fg border-tone-green-border shadow-sm shadow-emerald-500/10',
  amber: 'bg-tone-amber-bg text-tone-amber-fg border-tone-amber-border shadow-sm shadow-amber-500/10',
  red: 'bg-tone-red-bg text-tone-red-fg border-tone-red-border shadow-sm shadow-rose-500/10',
};

const TONE_ICONS: Record<ScoreTone, LucideIcon> = {
  green: CircleCheck,
  amber: CircleAlert,
  red: CircleX,
};

/**
 * Score badge: number + text label + icon. Colour is never the only signal.
 * Reuses the shared score thresholds from lib/score.
 */
export function ScoreBadge({ score, label }: { score: number; label: string }) {
  const tone = scoreColor(score);
  const Icon = TONE_ICONS[tone];
  return (
    <span
      className={`inline-flex min-h-[44px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-xl border px-2.5 py-1 transition-transform hover:scale-105 ${TONE_STYLES[tone]}`}
    >
      <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {score}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </span>
  );
}

/** Ring variant of the score indicator, modern circular gradient stroke, same thresholds and labelling. */
export function ScoreRing({ score, label }: { score: number; label: string }) {
  const tone = scoreColor(score);
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <span className="inline-flex flex-col items-center gap-1 group">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        role="img"
        aria-label={`${label} ${score}`}
        className="transition-transform duration-300 group-hover:scale-105"
      >
        <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="8" className="stroke-line/60 dark:stroke-slate-800" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          className={
            tone === 'green'
              ? 'stroke-emerald-600 dark:stroke-emerald-400'
              : tone === 'amber'
                ? 'stroke-amber-600 dark:stroke-amber-400'
                : 'stroke-rose-600 dark:stroke-rose-400'
          }
        />
        <text
          x="36"
          y="41"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          className="fill-ink tabular-nums font-bold"
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
    </span>
  );
}
