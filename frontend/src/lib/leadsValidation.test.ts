import { describe, expect, it } from 'vitest';
import { toOfferPayload, validateOffer } from './leadsValidation';

const VALID = {
  offer: 'Restaurant management software for billing and staff duties in local eateries',
  city: 'Ahmedabad',
  monthly_price: '800',
  max_leads: '10',
};

describe('validateOffer', () => {
  it('accepts a complete valid offer', () => {
    expect(validateOffer(VALID)).toEqual({});
  });

  it('rejects short and over-long offers', () => {
    expect(validateOffer({ ...VALID, offer: 'too short' }).offer).toMatch(/20–1000/);
    expect(validateOffer({ ...VALID, offer: `  ${'x'.repeat(19)}  ` }).offer).toBeTruthy();
    expect(validateOffer({ ...VALID, offer: 'x'.repeat(1001) }).offer).toBeTruthy();
    expect(validateOffer({ ...VALID, offer: 'x'.repeat(1000) }).offer).toBeUndefined();
  });

  it('rejects short and over-long cities', () => {
    expect(validateOffer({ ...VALID, city: 'X' }).city).toMatch(/2–80/);
    expect(validateOffer({ ...VALID, city: 'x'.repeat(81) }).city).toBeTruthy();
  });

  it('treats a blank price as omitted', () => {
    expect(validateOffer({ ...VALID, monthly_price: '   ' })).toEqual({});
  });

  it('rejects non-integer, negative and oversized prices', () => {
    expect(validateOffer({ ...VALID, monthly_price: '12.5' }).monthly_price).toBeTruthy();
    expect(validateOffer({ ...VALID, monthly_price: '-1' }).monthly_price).toBeTruthy();
    expect(validateOffer({ ...VALID, monthly_price: '1000001' }).monthly_price).toBeTruthy();
    expect(validateOffer({ ...VALID, monthly_price: '1000000' }).monthly_price).toBeUndefined();
  });

  it('bounds max leads between 5 and 20', () => {
    expect(validateOffer({ ...VALID, max_leads: '4' }).max_leads).toMatch(/5 to 20/);
    expect(validateOffer({ ...VALID, max_leads: '21' }).max_leads).toBeTruthy();
    expect(validateOffer({ ...VALID, max_leads: '7.5' }).max_leads).toBeTruthy();
    expect(validateOffer({ ...VALID, max_leads: '5' }).max_leads).toBeUndefined();
  });
});

describe('toOfferPayload', () => {
  it('trims text and casts integers', () => {
    const payload = toOfferPayload({
      ...VALID,
      offer: '  Padded offer text for billing and staff work here  ',
      city: '  Ahmedabad ',
    });
    expect(payload).toEqual({
      offer: 'Padded offer text for billing and staff work here',
      city: 'Ahmedabad',
      monthly_price: 800,
      max_leads: 10,
    });
    expect(typeof payload.max_leads).toBe('number');
  });

  it('omits a blank monthly price', () => {
    const payload = toOfferPayload({ ...VALID, monthly_price: '' });
    expect(payload).not.toHaveProperty('monthly_price');
    expect(payload.max_leads).toBe(10);
  });
});
