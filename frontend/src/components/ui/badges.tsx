import type { ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'red' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  green: 'bg-tone-green-bg text-tone-green-fg border-tone-green-border shadow-sm shadow-emerald-500/10',
  amber: 'bg-tone-amber-bg text-tone-amber-fg border-tone-amber-border shadow-sm shadow-amber-500/10',
  red: 'bg-tone-red-bg text-tone-red-fg border-tone-red-border shadow-sm shadow-rose-500/10',
  info: 'bg-tone-info-bg text-tone-info-fg border-tone-info-border shadow-sm shadow-blue-500/10',
  neutral: 'bg-surface/80 text-ink border-line/80',
};

/** Small status pill. Text always accompanies the colour. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Removable/standout keyword pill. */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-amber-500/40 bg-tone-amber-bg px-3 py-1 text-xs font-semibold text-tone-amber-fg shadow-sm">
      {children}
    </span>
  );
}

/** Raised content container with modern glassmorphic feel and subtle hover lift. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line/80 bg-raised/90 p-5 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}>
      {children}
    </div>
  );
}

/** Hide content visually while keeping it available to screen readers. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
