import type { SearchResponse } from '../../api/schemas';
import { RadarScope } from '../../components/RadarScope';
import { CountUp, Reveal } from '../../components/motion';
import { searchBlips } from '../map/blips';

/**
 * Sticky intelligence inspector: live radar scope from real results,
 * top-rated local hotspots and honest aggregate stats. Empty until the
 * first sweep completes.
 */
export function Inspector({ result }: { result: SearchResponse | null }) {
  if (!result) {
    return (
      <div className="flex flex-col gap-4 xl:sticky xl:top-20">
        <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand-strong" />
            Polar Sweep Scope
          </p>
          <div className="mt-3 opacity-60">
            <RadarScope label="Idle radar scope. Run a sweep to light up live signals." blips={[]} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Run a radar sweep to light up live signals from your results.
          </p>
        </div>
      </div>
    );
  }

  const blips = searchBlips(result);
  const scores = result.opportunities.map((item) => item.earn_score);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const blocked = result.jobs.filter((job) => job.risk === 'High').length;
  const hotspots = [...result.local]
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-4 xl:sticky xl:top-20">
      <Reveal className="rounded-xl border border-line bg-raised p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-tone-green-bg" />
            Polar Sweep Scope
          </p>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Sweep active
          </span>
        </div>
        <div className="mt-3">
          <RadarScope
            label={`Radar scope with ${blips.length} signals from your latest sweep`}
            blips={blips}
            caption={`${result.opportunities.length} opportunities · ${result.jobs.length} jobs · ${result.local.length} businesses`}
          />
        </div>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Signal legend">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#10b981]" /> Top-rated local
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-brand-strong" /> Opportunity
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> High risk
          </span>
        </p>
      </Reveal>

      <Reveal
        delay={0.05}
        className="rounded-xl border border-line bg-raised p-5 shadow-sm"
      >
        <p className="text-base font-bold text-ink">Sweep summary</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Ideas found</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={result.opportunities.length} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Avg EarnScore</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={Math.round(average)} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Scams blocked</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={blocked} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Local spots</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={result.local.length} format={(n) => `${n}`} />
            </dd>
          </div>
        </dl>
      </Reveal>

      <Reveal delay={0.1} className="rounded-xl border border-line bg-raised p-5 shadow-sm">
        <p className="text-base font-bold text-ink">Top-rated nearby</p>
        {hotspots.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No rated businesses in these results.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {hotspots.map((place) => (
              <li
                key={place.name}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{place.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {place.rating != null ? `★ ${place.rating}` : 'Unrated'}
                  {place.reviews != null ? ` (${place.reviews})` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </div>
  );
}
