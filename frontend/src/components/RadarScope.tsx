import { useId, useState } from 'react';

export type RadarTone = 'safe' | 'fit' | 'risk' | 'gap';

export interface RadarBlip {
  /** 0..100 position on each axis inside the scope. */
  x: number;
  y: number;
  tone: RadarTone;
  label: string;
  sub?: string;
}

const TONE_FILL: Record<RadarTone, string> = {
  safe: '#10b981',
  fit: '#4f46e5',
  risk: '#ef4444',
  gap: '#06b6d4',
};

function toScope(value: number): number {
  return 50 + (Math.max(0, Math.min(100, value)) - 50) * 1.6;
}

/**
 * Premium Stitch polar radar scope: radial glow, dashed rings, conic sweep
 * with leading beam, pinging blip halos, hover glass tooltips and a
 * pulsing center beacon. Pure SVG + CSS motion, stilled under
 * prefers-reduced-motion via global CSS.
 */
export function RadarScope({
  blips,
  label,
  caption,
  hud = true,
}: {
  blips: RadarBlip[];
  label: string;
  caption?: string;
  hud?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `er-scope-sweep-${uid}`;
  const glowId = `er-scope-glow-${uid}`;
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg viewBox="0 0 300 300" role="img" aria-label={label} className="h-auto w-full">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.10" />
            <stop offset="55%" stopColor="#4f46e5" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.5" />
            <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="150" cy="150" r="140" fill={`url(#${glowId})`} />
        <circle
          cx="150"
          cy="150"
          r="130"
          fill="none"
          stroke="var(--line)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <circle cx="150" cy="150" r="95" fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle
          cx="150"
          cy="150"
          r="60"
          fill="none"
          stroke="var(--line)"
          strokeDasharray="2 2"
          strokeWidth="1"
        />
        <circle cx="150" cy="150" r="25" fill="none" stroke="var(--line)" strokeWidth="1" />
        <line x1="150" y1="10" x2="150" y2="290" stroke="var(--line)" strokeWidth="1" />
        <line x1="10" y1="150" x2="290" y2="150" stroke="var(--line)" strokeWidth="1" />
        <line
          x1="40"
          y1="40"
          x2="260"
          y2="260"
          stroke="var(--line)"
          strokeDasharray="2 4"
          strokeWidth="0.5"
        />
        <line
          x1="40"
          y1="260"
          x2="260"
          y2="40"
          stroke="var(--line)"
          strokeDasharray="2 4"
          strokeWidth="0.5"
        />

        <g className="radar-sweep-slow">
          <path d="M 150 150 L 150 20 A 130 130 0 0 1 242 58 Z" fill={`url(#${gradientId})`} />
          <line
            x1="150"
            y1="150"
            x2="242"
            y2="58"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="242" cy="58" r="3.5" fill="#06b6d4" />
        </g>

        {blips.map((blip, index) => {
          const cx = (toScope(blip.x) / 100) * 300;
          const cy = (toScope(blip.y) / 100) * 300;
          const fill = TONE_FILL[blip.tone];
          const isActive = active === index;
          return (
            <g
              key={`${blip.label}|${blip.x}|${blip.y}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              role="button"
              aria-label={blip.sub ? `${blip.label} — ${blip.sub}` : blip.label}
              className="cursor-pointer outline-none"
            >
              <title>{blip.sub ? `${blip.label} — ${blip.sub}` : blip.label}</title>
              <circle
                cx={cx}
                cy={cy}
                r="13"
                fill="none"
                stroke={fill}
                strokeWidth="1"
                opacity="0.35"
                className="blip-halo"
                style={{ animationDelay: `${index * 0.35}s` }}
              />
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 7 : 5.5}
                fill={fill}
                style={{ transition: 'r 160ms ease' }}
              />
              <circle cx={cx} cy={cy} r="11" fill="transparent" />
              {blip.tone === 'risk' ? (
                <>
                  <line
                    x1={cx - 2.5}
                    y1={cy - 2.5}
                    x2={cx + 2.5}
                    y2={cy + 2.5}
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                  <line
                    x1={cx + 2.5}
                    y1={cy - 2.5}
                    x2={cx - 2.5}
                    y2={cy + 2.5}
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                </>
              ) : (
                <circle cx={cx} cy={cy} r="1.6" fill="#ffffff" opacity="0.9" />
              )}
            </g>
          );
        })}

        <circle
          cx="150"
          cy="150"
          r="14"
          fill="none"
          stroke="#4f46e5"
          strokeWidth="1"
          opacity="0.35"
          className="pulse-ring"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <circle cx="150" cy="150" r="7" fill="#4f46e5" />
        <circle cx="150" cy="150" r="3" fill="#ffffff" />
      </svg>

      {/* Hover glass tooltip */}
      {active !== null && blips[active] ? (
        <div className="glass-float pointer-events-none absolute left-1/2 top-4 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl px-3 py-2 text-left shadow-lg">
          <p className="text-xs font-bold text-ink">{blips[active].label}</p>
          {blips[active].sub ? (
            <p className="tnum mt-0.5 text-[11px] font-medium text-muted">{blips[active].sub}</p>
          ) : null}
        </div>
      ) : null}

      {hud ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="glass-float tnum rounded-full px-2.5 py-1 text-[10px] font-semibold text-muted">
            AZ: <span className="text-ink">142.8°</span> • EL: <span className="text-ink">12°</span>
          </span>
          <span className="glass-float inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live sweep
          </span>
        </div>
      ) : null}

      {caption ? <p className="tnum mt-2 text-center text-xs text-muted">{caption}</p> : null}
    </div>
  );
}
