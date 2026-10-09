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
