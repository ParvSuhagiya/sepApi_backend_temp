import { describe, expect, it } from 'vitest';
import { leadsBlips, searchBlips } from './blips';
import type { LeadsResponse, SearchResponse } from '../../api/schemas';
import { leadsSuccess, searchSuccess } from '../../test/fixtures';

describe('radar blips', () => {
  it('maps live search results to stable blips', () => {
    const result = searchSuccess as unknown as SearchResponse;
    const first = searchBlips(result);
    const second = searchBlips(result);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((blip) => blip.x >= 10 && blip.x <= 90)).toBe(true);
    const tones = new Set(first.map((blip) => blip.tone));
    expect(tones.has('fit')).toBe(true);
  });

  it('caps lists and flags high-risk jobs and unrated places', () => {
    const base = searchSuccess as unknown as SearchResponse;
    const many = Array.from({ length: 6 }, (_, index) => ({
      ...base.opportunities[0],
      title: `Idea ${index}`,
    }));
    const result: SearchResponse = {
      ...base,
      opportunities: many,
      local: [
        { name: 'Unrated Shop', rating: null, reviews: null },
        { name: 'Quiet Shop', rating: 2.5, reviews: null },
      ],
      jobs: [
        {
          title: 'Risky Gigs',
          company: 'X',
          location: 'Y',
          flags: [],
          risk: 'High',
        },
      ],
    };
    const blips = searchBlips(result);
    expect(blips.filter((blip) => blip.tone === 'fit')).toHaveLength(4);
    expect(blips.some((blip) => blip.tone === 'risk')).toBe(true);
    expect(blips.every((blip) => blip.x >= 18 && blip.x <= 82)).toBe(true);
  });

  it('tones software owners as safe leads', () => {
    const result = leadsSuccess as unknown as LeadsResponse;
    expect(leadsBlips(result)[0]?.tone).toBe('fit');
    const withSoftware: LeadsResponse = {
      ...result,
      leads: [{ ...result.leads[0], likely_has_software: true }],
    };
    expect(leadsBlips(withSoftware)[0]?.tone).toBe('safe');
  });

  it('maps live leads to score blips', () => {
    const result = leadsSuccess as unknown as LeadsResponse;
    const blips = leadsBlips(result);
    expect(blips).toHaveLength(result.leads.length);
    expect(blips[0]?.sub).toContain('Lead score');
  });

  it('returns nothing for empty results', () => {
    const empty = {
      ...searchSuccess,
      opportunities: [],
      local: [],
      jobs: [],
    } as unknown as SearchResponse;
    expect(searchBlips(empty)).toEqual([]);
  });
});
