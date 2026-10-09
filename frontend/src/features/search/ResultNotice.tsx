import { useState } from 'react';

const FRIENDLY_NOTES: Record<string, string> = {
  fewer_than_5_opportunities: 'We found fewer than 5 strong opportunities for this profile.',
};

export interface ResultNoticeProps {
  degraded: string[];
  partial: string[];
  notes: string[];
}

/** Dismissible banner for degraded/partial sources and backend notes. */
export function ResultNotice({ degraded, partial, notes }: ResultNoticeProps) {
  const [dismissed, setDismissed] = useState(false);
  const lines: string[] = [];
  if (degraded.length > 0) {
    lines.push(`Some sources were unavailable: ${degraded.join(', ')}.`);
  }
  if (partial.length > 0) {
    lines.push(`Partial data from: ${partial.join(', ')}.`);
  }
  for (const note of notes) {
    lines.push(FRIENDLY_NOTES[note] ?? note);
  }
  if (dismissed || lines.length === 0) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4 shadow-sm"
    >
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] rounded-md px-3 text-sm font-semibold text-ink underline hover:bg-surface"
        >
          Dismiss notice
        </button>
      </div>
    </div>
  );
}
