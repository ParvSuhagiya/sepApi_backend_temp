import { describe, expect, it } from 'vitest';
import type { ShortlistItem } from './shortlist';
import { toCsv, toMarkdown } from './shortlistExport';

const ITEMS: ShortlistItem[] = [
  {
    id: 'lead:Sharma Tailoring',
    kind: 'lead',
    title: 'Sharma Tailoring',
    subtitle: 'Tailor · MG Road',
    phone: '919822012345',
    note: 'call Tuesday',
  },
  {
    id: 'job:Tailor|ABC',
    kind: 'job',
    title: 'Tailor, "senior"',
    subtitle: '',
    phone: null,
    note: '',
  },
];

describe('toCsv', () => {
  it('excludes phone numbers by default', () => {
    const csv = toCsv(ITEMS, false);
    expect(csv.split('\n')[0]).toBe('Type,Title,Details,Note,Phone');
    expect(csv).not.toContain('919822012345');
    expect(csv).toContain('Sharma Tailoring');
    expect(csv).toContain('call Tuesday');
  });

  it('includes phone numbers when ticked', () => {
    const csv = toCsv(ITEMS, true);
    expect(csv).toContain('919822012345');
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv(ITEMS, false);
    expect(csv).toContain('"Tailor, ""senior"""');
  });
});

describe('toMarkdown', () => {
  it('summarises the set with the privacy line', () => {
    const text = toMarkdown(ITEMS);
    expect(text).toContain('# Shortlist (2)');
    expect(text).toContain('**Sharma Tailoring** (lead)');
    expect(text).toContain('Note: call Tuesday');
    expect(text).toContain('Closing this tab clears your shortlist.');
  });
});
