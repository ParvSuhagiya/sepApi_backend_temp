import { describe, expect, it } from 'vitest';
import { toProfilePayload, validateProfile } from './validation';

const valid = { skills: 'tailoring', city: 'Pune', hours: '12', budget: '0' };

describe('validateProfile', () => {
  it('blocks empty skills (T-12)', () => {
    expect(validateProfile({ ...valid, skills: ' ' })).toMatchObject({
      skills: expect.stringMatching(/skills \(2–300 characters\)/i),
    });
  });

  it('accepts a valid profile with no errors', () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it('rejects out-of-range hours and negative budget', () => {
    expect(validateProfile({ ...valid, hours: '0' })).toHaveProperty('hours');
    expect(validateProfile({ ...valid, hours: '169' })).toHaveProperty('hours');
    expect(validateProfile({ ...valid, hours: '1.5' })).toHaveProperty('hours');
    expect(validateProfile({ ...valid, budget: '-5' })).toHaveProperty('budget');
  });
});

describe('toProfilePayload', () => {
  it('casts numeric fields to integers', () => {
    const payload = toProfilePayload(valid);
    expect(payload).toEqual({ skills: 'tailoring', city: 'Pune', hours: 12, budget: 0 });
    expect(typeof payload.hours).toBe('number');
  });
});
