import type { SearchResponse } from '../../api/schemas';
import { CountUp, Reveal } from '../../components/motion';

/** Results summary panel — no radar, clean stats grid */
export function Inspector({ result }: { result: SearchResponse | null }) {
  if (!result) {
    return (
      <div className="er-card flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="er-icon-wrap er-icon-brand">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7v3m0 0v3m0-3h3m-3 0H7.5" />
          </svg>
        </div>
        <p className="er-label">Results will appear here</p>
        <p className="er-hint">Fill in the form and click Search to get started</p>
      </div>
    );
  }

  const scores = result.opportunities.map((item) => item.earn_score);
  const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const blocked = result.jobs.filter((job) => job.risk === 'High').length;
  const hotspots = [...result.local]
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <Reveal className="er-card">
        <p className="er-section-title mb-4">Sweep Results</p>
        <dl className="grid grid-cols-2 gap-3">
          {[
            { label: 'Ideas found', value: result.opportunities.length },
            { label: 'Avg score', value: average },
            { label: 'Scams blocked', value: blocked },
            { label: 'Local leads', value: result.local.length },
          ].map((s) => (
            <div key={s.label} className="er-stat-tile">
              <dt className="er-label">{s.label}</dt>
              <dd className="er-stat-value">
                <CountUp value={s.value} format={(n) => `${n}`} />
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* Top nearby */}
      {hotspots.length > 0 && (
        <Reveal delay={0.05} className="er-card">
          <p className="er-section-title mb-3">Top Nearby</p>
          <ul className="flex flex-col gap-2">
            {hotspots.map((place) => (
              <li
                key={place.name}
                className="flex items-center justify-between gap-2 rounded-lg bg-[--er-surface] px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-[--er-ink]">{place.name}</span>
                <span className="shrink-0 text-xs text-[--er-muted] tabular-nums">
                  {place.rating != null ? `★ ${place.rating}` : '—'}
                  {place.reviews != null ? ` (${place.reviews})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );
}
