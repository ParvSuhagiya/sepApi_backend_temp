import { describe, expect, it } from 'vitest';
import { leadPinSize, splitSnippets } from './leadUtils';

describe('splitSnippets', () => {
  it('prefers explicit pain snippets, capped at 3', () => {
    expect(
      splitSnippets({
        pain_snippets: ['a', 'b', 'c', 'd'],
        research_notes: 'x; y',
      }),
    ).toEqual(['a', 'b', 'c']);
  });

  it('recovers snippets joined into research notes', () => {
    expect(
      splitSnippets({ pain_snippets: null, research_notes: 'bill was wrong; waited a long time' }),
    ).toEqual(['bill was wrong', 'waited a long time']);
  });

  it('returns nothing without evidence', () => {
    expect(splitSnippets({ pain_snippets: null, research_notes: null })).toEqual([]);
    expect(splitSnippets({ pain_snippets: [], research_notes: '  ' })).toEqual([]);
  });
});

describe('leadPinSize', () => {
  it('grows with the score within 24..36 px', () => {
    expect(leadPinSize(0)).toBe(24);
    expect(leadPinSize(100)).toBe(36);
    expect(leadPinSize(82)).toBeGreaterThan(leadPinSize(20));
  });

  it('clamps garbage to the range', () => {
    expect(leadPinSize(-5)).toBe(24);
    expect(leadPinSize(500)).toBe(36);
    expect(leadPinSize(Number.NaN)).toBe(24);
  });
});
