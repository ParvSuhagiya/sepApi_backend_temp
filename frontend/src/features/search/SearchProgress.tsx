import { useEffect, useState } from 'react';
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

/** Staged progress: advances every 3.5 s, stops on the last stage. */
export function SearchProgress({ retrying }: { retrying: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= STAGES.length - 1) return;
    const timer = setTimeout(() => setIndex((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <ProgressSteps steps={STAGES} currentIndex={index} />
      <p className="text-sm text-muted">{`Step ${index + 1} of ${STAGES.length}: ${STAGES[index]}`}</p>
      {retrying ? (
        <p className="text-sm font-medium text-ink">
          Waking up the server, this can take up to a minute.
        </p>
      ) : null}
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
          className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
