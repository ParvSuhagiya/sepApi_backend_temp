import { describe, expect, it } from 'vitest';
import type { Lead } from '../../api/schemas';
import { buildLeadPins, leadShortlistIds } from './leadPins';

function lead(name: string, overrides: Partial<Lead> = {}): Lead {
  return {
    name,
    match_score: 70,
    match_reasons: ['Listed on Google Maps'],
    score_breakdown: {},
    likely_has_software: false,
    adjustments: [],
    ...overrides,
  };
}

describe('buildLeadPins', () => {
  it('keeps only leads with numeric coordinates', () => {
    const pins = buildLeadPins([
      lead('Pinned', { lat: 23.02, lng: 72.57, match_score: 82 }),
      lead('No coords'),
    ]);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ id: 'lead-0', lat: 23.02, lng: 72.57, score: 82 });
  });

  it('sizes pins by score and flags shortlisted ids', () => {
    const pins = buildLeadPins(
      [lead('Low', { lat: 1, lng: 1, match_score: 10 }), lead('High', { lat: 2, lng: 2, match_score: 95 })],
      new Set(['lead-1']),
    );
    expect(pins[1]?.size).toBeGreaterThan(pins[0]?.size ?? 0);
    expect(pins[0]?.shortlisted).toBe(false);
    expect(pins[1]?.shortlisted).toBe(true);
  });
});

describe('leadShortlistIds', () => {
  it('maps starred titles back to pin ids', () => {
    const leads = [lead('Alpha'), lead('Beta')];
    expect(leadShortlistIds(leads, new Set(['Beta']))).toEqual(new Set(['lead-1']));
    expect(leadShortlistIds(leads, new Set())).toEqual(new Set());
  });
});
