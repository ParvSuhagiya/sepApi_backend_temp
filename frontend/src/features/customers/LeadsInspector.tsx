import type { LeadsResponse } from '../../api/schemas';
import { RadarScope } from '../../components/RadarScope';
import { CountUp, Reveal } from '../../components/motion';
import { leadsBlips } from '../map/blips';
import { MarketNotes } from './MarketNotes';

/**
 * Sticky leads inspector: radar scope from live leads, market benchmark
 * from competitor notes, and honest aggregate stats.
 */
export function LeadsInspector({ result }: { result: LeadsResponse | null }) {
  if (!result) {
    return (
      <div className="flex flex-col gap-4 xl:sticky xl:top-20">
        <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand-strong" />
            Buyer Density Radar
          </p>
          <div className="mt-3 opacity-60">
            <RadarScope label="Idle buyer radar. Describe your offer to light up buyer signals." blips={[]} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Describe your offer to light up buyer signals on the radar.
          </p>
        </div>
      </div>
    );
  }

  const blips = leadsBlips(result);
  const scores = result.leads.map((lead) => lead.match_score);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const withPhone = result.leads.filter((lead) => lead.phone).length;
  const priceUnknown = result.market_notes.some(
    (note) => note.trim().toLowerCase() === 'price not found',
  );

  return (
    <div className="flex flex-col gap-4 xl:sticky xl:top-20">
      <Reveal className="rounded-xl border border-line bg-raised p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-base font-bold text-ink">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-tone-green-bg" />
            Buyer Density Radar
          </p>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            {result.leads.length} buyer{result.leads.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-3">
          <RadarScope
            label={`Buyer radar with ${blips.length} buyer signals from your latest scan`}
            blips={blips}
            caption={`${result.leads.length} ranked leads · ${withPhone} with phone numbers`}
          />
        </div>
      </Reveal>

      <Reveal
        delay={0.05}
        className="rounded-xl border border-line bg-raised p-5 shadow-sm"
      >
        <p className="text-base font-bold text-ink">Scan summary</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Leads found</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={result.leads.length} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Avg match</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={Math.round(average)} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Reachable</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={withPhone} format={(n) => `${n}`} />
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Credits used</dt>
            <dd className="font-display text-2xl font-bold tabular-nums text-ink">
              <CountUp value={result.meta.credits_used} format={(n) => `${n}`} />
            </dd>
          </div>
        </dl>
      </Reveal>

      <Reveal delay={0.1} className="rounded-xl border border-line bg-raised p-5 shadow-sm">
        <p className="text-base font-bold text-ink">Market benchmark</p>
        <div className="mt-2">
          <MarketNotes notes={result.market_notes} />
        </div>
        {priceUnknown ? (
          <p className="mt-2 text-xs text-muted">
            Competitor pricing wasn&apos;t found in public results — confirm prices yourself
            before quoting.
          </p>
        ) : null}
      </Reveal>
    </div>
  );
}
