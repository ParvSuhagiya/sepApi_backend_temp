import { Info } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';

export interface EfficiencyProps {
  creditsUsed: number;
  cacheHits: number;
  durationMs: number;
}

/** Cache/credit transparency line with an explanatory tooltip. */
export function EfficiencyStrip({ creditsUsed, cacheHits, durationMs }: EfficiencyProps) {
  const seconds = (durationMs / 1000).toFixed(1);
  return (
    <p className="text-sm text-muted">
      {`SerpAPI credits used: ${creditsUsed} · Served from cache: ${cacheHits} · Took ${seconds}s`}{' '}
      <Tooltip content="Search results are cached per query. A repeated identical search is served from cache and costs 0 credits.">
        <button
          type="button"
          aria-label="About result caching"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md align-middle text-muted hover:text-ink"
        >
          <Info aria-hidden="true" className="h-4 w-4" />
        </button>
      </Tooltip>
    </p>
  );
}
