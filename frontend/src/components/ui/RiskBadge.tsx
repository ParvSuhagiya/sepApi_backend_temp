import { ShieldAlert, ShieldCheck, ShieldX, type LucideIcon } from 'lucide-react';

export type RiskLevel = 'Low' | 'Medium' | 'High';

const RISK_STYLES: Record<RiskLevel, { classes: string; icon: LucideIcon; text: string }> = {
  Low: {
    classes: 'bg-tone-green-bg text-tone-green-fg border-tone-green-border',
    icon: ShieldCheck,
    text: 'Low risk',
  },
  Medium: {
    classes: 'bg-tone-amber-bg text-tone-amber-fg border-tone-amber-border',
    icon: ShieldAlert,
    text: 'Medium risk',
  },
  High: {
    classes: 'bg-tone-red-bg text-tone-red-fg border-tone-red-border',
    icon: ShieldX,
    text: 'High risk',
  },
};

/** Scam-shield signal badge. Text + icon accompany the colour; a signal, not a verdict. */
export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const { classes, icon: Icon, text } = RISK_STYLES[risk];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

/** Label + tabular value pair for meta rows. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
