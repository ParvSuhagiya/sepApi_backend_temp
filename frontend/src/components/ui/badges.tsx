import type { ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'red' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  green: 'bg-tone-green-bg text-tone-green-fg border-tone-green-border',
  amber: 'bg-tone-amber-bg text-tone-amber-fg border-tone-amber-border',
  red: 'bg-tone-red-bg text-tone-red-fg border-tone-red-border',
  info: 'bg-tone-info-bg text-tone-info-fg border-tone-info-border',
  neutral: 'bg-surface text-ink border-line',
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
    <span className="inline-block rounded-full border border-amber-600 bg-tone-amber-bg px-3 py-1 text-xs font-semibold text-tone-amber-fg">
      {children}
    </span>
  );
}

/** Raised content container. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-lg border border-line bg-raised p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** Hide content visually while keeping it available to screen readers. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
