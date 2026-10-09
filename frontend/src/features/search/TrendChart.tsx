import { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendChartProps {
  keyword: string | null;
  growth: Record<string, number>;
  points: Array<{ date: string; value: number }>;
}

function growthText(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}%`;
}

/**
 * Demand trend: line + area with a keyword toggle and a table fallback.
 * Returns null when there is nothing to show.
 */
export function TrendChart({ keyword, growth, points }: TrendChartProps) {
  const keys = Object.keys(growth);
  const [active, setActive] = useState<string | null>(keyword ?? keys[0] ?? null);
  const effective = active ?? keyword ?? keys[0] ?? null;

  if (points.length === 0 && keys.length === 0) return null;

  const showChart = points.length > 0 && (effective === null || effective === keyword);

  return (
    <div className="flex flex-col gap-3">
      {keys.length > 1 ? (
        <div role="group" aria-label="Trend keyword" className="flex flex-wrap gap-2">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={effective === key}
              onClick={() => setActive(key)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold ${
                effective === key
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line bg-raised text-ink hover:bg-surface'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      ) : null}
      {effective && growth[effective] !== undefined ? (
        <h4 className="text-base font-bold text-ink">
          {effective} · <span className="tabular-nums">{growthText(growth[effective] as number)}</span>
        </h4>
      ) : null}
      {showChart ? (
        <>
          <div className="h-64 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} height={16} />
                <YAxis width={48} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--raised)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                  }}
                />
                <Area type="monotone" dataKey="value" fill="var(--brand)" fillOpacity={0.15} stroke="none" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--brand-strong)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <details className="rounded-md bg-surface p-3">
            <summary className="cursor-pointer rounded-sm text-sm font-semibold text-ink">
              Data table{effective ? ` for ${effective}` : ''}
            </summary>
            <table className="mt-2 w-full text-sm">
              <caption className="sr-only">Trend values over time</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-1 text-left font-semibold text-muted">
                    Date
                  </th>
                  <th scope="col" className="p-1 text-right font-semibold text-muted">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.date} className="border-t border-line">
                    <td className="p-1 text-ink">{point.date}</td>
                    <td className="p-1 text-right tabular-nums text-ink">{point.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="text-sm text-muted">
          {effective
            ? `No chart data for ${effective}; growth shown above.`
            : 'No trend data for this search.'}
        </p>
      )}
    </div>
  );
}
