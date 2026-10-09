export type RadarTone = 'safe' | 'fit' | 'risk';

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
};

function toScope(value: number): number {
  return 50 + (Math.max(0, Math.min(100, value)) - 50) * 1.6;
}

/**
 * Animated polar radar scope: rings, crosshairs, rotating sweep wedge and
 * tone-coded blips. Pure CSS/SVG motion, stilled under reduced motion.
 */
export function RadarScope({
  blips,
  label,
  caption,
}: {
  blips: RadarBlip[];
  label: string;
  caption?: string;
}) {
  return (
    <div>
      <svg viewBox="0 0 300 300" role="img" aria-label={label} className="h-auto w-full">
        <circle cx="150" cy="150" r="130" fill="none" stroke="var(--line)" strokeDasharray="3 3" strokeWidth="1" />
        <circle cx="150" cy="150" r="95" fill="none" stroke="var(--line)" strokeWidth="1" />
        <circle cx="150" cy="150" r="60" fill="none" stroke="var(--line)" strokeDasharray="2 2" strokeWidth="1" />
        <circle cx="150" cy="150" r="25" fill="none" stroke="var(--line)" strokeWidth="1" />
        <line x1="150" y1="10" x2="150" y2="290" stroke="var(--line)" strokeWidth="1" />
        <line x1="10" y1="150" x2="290" y2="150" stroke="var(--line)" strokeWidth="1" />
        <line x1="40" y1="40" x2="260" y2="260" stroke="var(--line)" strokeDasharray="2 4" strokeWidth="0.5" />
        <line x1="40" y1="260" x2="260" y2="40" stroke="var(--line)" strokeDasharray="2 4" strokeWidth="0.5" />
        <g className="radar-sweep-slow">
          <path
            d="M 150 150 L 150 20 A 130 130 0 0 1 242 58 Z"
            fill="url(#er-scope-sweep)"
          />
          <line x1="150" y1="150" x2="242" y2="58" stroke="#4f46e5" strokeWidth="2" />
        </g>
        <defs>
          <linearGradient id="er-scope-sweep" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {blips.map((blip) => {
          const cx = (toScope(blip.x) / 100) * 300;
          const cy = (toScope(blip.y) / 100) * 300;
          const fill = TONE_FILL[blip.tone];
          return (
            <g key={`${blip.label}|${blip.x}|${blip.y}`}>
              <title>{blip.sub ? `${blip.label} — ${blip.sub}` : blip.label}</title>
              <circle cx={cx} cy={cy} r="12" fill="none" stroke={fill} strokeWidth="1" opacity="0.4" />
              <circle cx={cx} cy={cy} r="5" fill={fill} />
              {blip.tone === 'risk' ? (
                <>
                  <line x1={cx - 2.5} y1={cy - 2.5} x2={cx + 2.5} y2={cy + 2.5} stroke="#ffffff" strokeWidth="1.4" />
                  <line x1={cx + 2.5} y1={cy - 2.5} x2={cx - 2.5} y2={cy + 2.5} stroke="#ffffff" strokeWidth="1.4" />
                </>
              ) : null}
            </g>
          );
        })}
        <circle cx="150" cy="150" r="7" fill="#4f46e5" />
        <circle cx="150" cy="150" r="3" fill="#ffffff" />
      </svg>
      {caption ? <p className="mt-2 text-center text-xs text-muted">{caption}</p> : null}
    </div>
  );
}
