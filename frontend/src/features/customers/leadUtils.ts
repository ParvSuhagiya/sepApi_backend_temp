import type { Lead } from '../../api/schemas';

/** Backend score weights: must sum to 1.0 (see scoring.py). */
export const LEAD_SCORE_WEIGHTS = {
  mid_level: 40,
  pain: 30,
  reachability: 15,
  no_software: 15,
} as const;

/** Polite opt-out the backend appends deterministically; drafts must keep it. */
export const LEAD_OPT_OUT_LINE =
  "If this isn't relevant, just let me know and I won't message again.";

/**
 * Up to 3 review snippets for a lead. Prefers the explicit array (when the
 * backend sends it); otherwise recovers the snippets the backend joined
 * into `research_notes` with "; ". Never edited, only split.
 */
export function splitSnippets(lead: Pick<Lead, 'pain_snippets' | 'research_notes'>): string[] {
  if (lead.pain_snippets && lead.pain_snippets.length > 0) {
    return lead.pain_snippets.slice(0, 3);
  }
  const notes = lead.research_notes ?? '';
  return notes
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** Clamp a score to 0..100 for marker sizing. */
export function leadPinSize(score: number): number {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  return 24 + Math.round((clamped / 100) * 12);
}
