import { describe, expect, it } from 'vitest';
import type { JobResult, PlaceResult } from '../../api/schemas';
import { buildPins, jobPinIds } from './pins';

function job(overrides: Partial<JobResult> = {}): JobResult {
  return {
    title: 'Tailor needed',
    company: 'ABC',
    location: 'Pune',
    desc: 'Stitching work',
    flags: [],
    risk: 'Low',
    ...overrides,
  };
}

function place(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return { name: 'Sharma Tailoring', ...overrides };
}

describe('buildPins', () => {
  it('keeps only items with numeric coordinates', () => {
    const pins = buildPins(
      [
        job({ lat: 18.5, lng: 73.8 }),
        job({ lat: null, lng: null }),
        job({ location: 'Remote' }),
      ],
      [place({ lat: 18.1, lng: 73.1 }), place({})],
    );
    expect(pins.map((pin) => pin.id)).toEqual(['job-0', 'place-0']);
  });

  it('marks city and approximate precision', () => {
    const pins = buildPins(
      [
        job({ lat: 1, lng: 2, geo_precision: 'city' }),
        job({ lat: 3, lng: 4, geo_precision: 'approximate' }),
        job({ lat: 5, lng: 6 }),
      ],
      [],
    );
    expect(pins.map((pin) => pin.approximate)).toEqual([true, true, false]);
  });

  it('carries job details and defaults unknown risk to Low', () => {
    const pins = buildPins(
      [job({ lat: 1, lng: 2, risk: 'High', salary: '₹9', link: 'https://x.test/a' })],
      [],
    );
    expect(pins[0]).toMatchObject({
      risk: 'High',
      salary: '₹9',
      link: 'https://x.test/a',
    });
    const [fallback] = buildPins([job({ lat: 1, lng: 2, risk: undefined })], []);
    expect(fallback?.risk).toBe('Low');
  });

  it('exposes job pin ids for list sync', () => {
    const pins = buildPins([job({ lat: 1, lng: 2 })], [place({ lat: 3, lng: 4 })]);
    expect(jobPinIds(pins)).toEqual(new Set(['job-0']));
  });
});
