import { useEffect, useState } from 'react';
import { Radar, Sparkles } from 'lucide-react';
import { ProgressSteps, Skeleton } from '../../components/ui';

const STAGES = [
  'Understanding your profile',
  'Searching jobs',
  'Scanning local businesses',
  'Checking demand trends',
  'Reading forums',
  'Ranking opportunities',
];

const STEP_MS = 3500;

export const SEARCH_STAGES = STAGES;

/** Staged progress with modern animated radar visual: advances every 3.5 s, stops on the last stage. */
export function SearchProgress({ retrying }: { retrying: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= STAGES.length - 1) return;
    const timer = setTimeout(() => setIndex((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      aria-live="polite"
      className="relative overflow-hidden rounded-3xl border border-line/80 bg-raised/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl animate-reveal"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Animated Radar Visual */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-surface/90 shadow-inner">
          <div className="absolute inset-2 rounded-full border border-dashed border-brand/30 pulse-ring" />
          <div className="absolute inset-5 rounded-full border border-brand/20" />
          <div className="absolute h-full w-full rounded-full overflow-hidden">
            <div
              className="radar-sweep-beam absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 origin-top-left"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(99, 102, 241, 0.4) 360deg)',
              }}
            />
          </div>
          <Radar className="relative z-10 h-8 w-8 text-brand animate-pulse" />
        </div>

        <div className="flex-1 text-center sm:text-left flex flex-col gap-3">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Live AI Market Scan in Progress
            </span>
          </div>
          <h3 className="text-lg font-bold text-ink flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="h-4 w-4 text-brand" />
            <span>{STAGES[index]}…</span>
          </h3>
          <ProgressSteps steps={STAGES} currentIndex={index} />
          <div className="flex items-center justify-between text-xs text-muted font-medium">
            <span>{`Step ${index + 1} of ${STAGES.length}`}</span>
            <span>{Math.round(((index + 1) / STAGES.length) * 100)}% complete</span>
          </div>
          {retrying ? (
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
              ⚡ Waking up the server, this can take up to a minute on cold start.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Skeleton cards shaped like the results layout (prevents layout shift). */
export function SearchResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading results" className="flex flex-col gap-4">
      {[0, 1].map((card) => (
        <div
          key={card}
          className="flex flex-col gap-3 rounded-2xl border border-line/80 bg-raised/90 p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
